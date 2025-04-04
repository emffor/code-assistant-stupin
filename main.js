const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CryptoJS = require('crypto-js');
const screenshot = require('screenshot-desktop');

// Configuração do store com criptografia
const store = new Store({
  encryptionKey: 'app-secretkey-changethis',
  name: 'settings'
});

// Definição de atalhos padrão
const DEFAULT_SHORTCUTS = {
  capture: 'Alt+S',
  toggle: 'Alt+H',
  opacity30: 'Alt+1',
  opacity60: 'Alt+2',
  opacity100: 'Alt+3',
};

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    skipTaskbar: true, // Oculta da barra de tarefas
    alwaysOnTop: true  // Mantém sobre outras janelas
  });

  // Carrega a interface React
  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5555');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  }
  
  // Inicializa atalhos
  registerShortcuts();
}

function registerShortcuts() {
  // Limpa atalhos anteriores
  globalShortcut.unregisterAll();
  
  // Carrega configurações de atalhos ou usa padrão
  const shortcuts = store.get('shortcuts') || DEFAULT_SHORTCUTS;
  
  // Registra atalho para captura de tela
  if (shortcuts.capture) {
    globalShortcut.register(shortcuts.capture, () => {
      captureScreen();
    });
  }
  
  // Registra atalho para mostrar/ocultar app
  if (shortcuts.toggle) {
    globalShortcut.register(shortcuts.toggle, () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  }
}

async function captureScreen() {
  try {
    // Implementação anti-detecção: oculta o app enquanto captura
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
      // Pequeno delay para garantir que a janela sumiu
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Captura a tela
    const img = await screenshot();
    
    // Restaura a visibilidade
    if (wasVisible) {
      mainWindow.show();
    }
    
    // Envia a imagem para o processo de renderização
    mainWindow.webContents.send('screenshot-captured', img.toString('base64'));
  } catch (error) {
    console.error('Erro na captura:', error);
    mainWindow.webContents.send('screenshot-error', error.message);
  }
}

app.whenReady().then(createWindow);

// Comunicação IPC segura
ipcMain.handle('capture-screen', () => {
  return captureScreen();
});

ipcMain.handle('get-api-key', () => {
  const encryptedKey = store.get('apiKey');
  if (!encryptedKey) return null;
  
  try {
    return CryptoJS.AES.decrypt(encryptedKey, 'app-secretkey-changethis').toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar API key:', error);
    return null;
  }
});

ipcMain.handle('save-api-key', (event, apiKey) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(apiKey, 'app-secretkey-changethis').toString();
    store.set('apiKey', encrypted);
    return true;
  } catch (error) {
    console.error('Erro ao salvar API key:', error);
    return false;
  }
});

ipcMain.handle('get-shortcuts', () => {
  return store.get('shortcuts') || DEFAULT_SHORTCUTS;
});

ipcMain.handle('save-shortcuts', (event, shortcuts) => {
  store.set('shortcuts', shortcuts);
  registerShortcuts();
  return true;
});

// Previne múltiplas instâncias do app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Limpa atalhos ao sair
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Mantém app rodando mesmo fechando todas as janelas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});