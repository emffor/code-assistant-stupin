const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CryptoJS = require('crypto-js');

// Configuração de armazenamento criptografado
const store = new Store({
  encryptionKey: 'sua-chave-segura',
  name: 'config'
});

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
    skipTaskbar: true // Oculta da barra de tarefas
  });

  // Carrega a interface React
  mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  
  // Modo de desenvolvimento
  // mainWindow.webContents.openDevTools();
  
  // Registra atalho global para captura (Alt+S)
  registerShortcuts();
}

function registerShortcuts() {
  // Captura de tela
  globalShortcut.register('Alt+S', () => {
    captureScreen();
  });
  
  // Mostrar/ocultar aplicativo
  globalShortcut.register('Alt+H', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

async function captureScreen() {
  try {
    const screenshot = require('screenshot-desktop');
    const img = await screenshot();
    mainWindow.webContents.send('screenshot-captured', img.toString('base64'));
  } catch (error) {
    console.error('Erro na captura:', error);
  }
}

app.whenReady().then(createWindow);

// Comunicação IPC segura
ipcMain.handle('get-api-key', () => {
  const encryptedKey = store.get('apiKey');
  if (!encryptedKey) return null;
  
  return CryptoJS.AES.decrypt(encryptedKey, 'sua-chave-segura').toString(CryptoJS.enc.Utf8);
});

ipcMain.handle('save-api-key', (event, apiKey) => {
  const encrypted = CryptoJS.AES.encrypt(apiKey, 'sua-chave-segura').toString();
  store.set('apiKey', encrypted);
});

// Limpa atalhos ao sair
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});