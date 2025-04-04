const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CryptoJS = require('crypto-js');
const screenshot = require('screenshot-desktop');

const store = new Store({
  encryptionKey: 'app-secretkey-changethis',
  name: 'settings'
});

// Defina os atalhos padrão incluindo os novos para lote
const DEFAULT_SHORTCUTS = {
  capture: 'Alt+S',
  toggle: 'Alt+H',
  opacity30: 'Alt+1',
  opacity60: 'Alt+2',
  opacity100: 'Alt+3',
  batchCapture: 'Alt+D',  // Novo atalho para capturar para o lote
  batchSend: 'Alt+F'      // Novo atalho para enviar o lote
};

const ENCRYPTION_KEY = 'app-secretkey-changethis';

let mainWindow;
let screenshotBatch = []; // Array para armazenar capturas em lote

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    skipTaskbar: true,
    alwaysOnTop: true
  });

  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5555');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  }

  mainWindow.setHasShadow(false);
  registerShortcuts();
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  
  const shortcuts = store.get('shortcuts') || DEFAULT_SHORTCUTS;
  console.log('[DEBUG] Registrando atalhos:', JSON.stringify(shortcuts));
  
  if (shortcuts.capture) {
    const registeredCapture = globalShortcut.register(shortcuts.capture, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.capture} pressionado.`);
      captureScreen();
    });
    if (!registeredCapture) {
      console.error(`Falha ao registrar atalho: ${shortcuts.capture}`);
    } else {
      console.log(`Atalho ${shortcuts.capture} registrado com sucesso.`);
    }
  }
  
  if (shortcuts.toggle) {
    const registeredToggle = globalShortcut.register(shortcuts.toggle, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.toggle} pressionado.`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('[CALLBACK] Alternando visibilidade.');
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      } else {
        console.error('[CALLBACK] mainWindow não definida ou destruída ao tentar alternar visibilidade.');
      }
    });
    if (!registeredToggle) {
      console.error(`Falha ao registrar atalho: ${shortcuts.toggle}`);
    } else {
      console.log(`Atalho ${shortcuts.toggle} registrado com sucesso.`);
    }
  }
  
  // Novos atalhos para captura em lote
  if (shortcuts.batchCapture) {
    const registeredBatchCapture = globalShortcut.register(shortcuts.batchCapture, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.batchCapture} pressionado.`);
      captureScreenToBatch();
    });
    if (!registeredBatchCapture) {
      console.error(`Falha ao registrar atalho: ${shortcuts.batchCapture}`);
    } else {
      console.log(`Atalho ${shortcuts.batchCapture} registrado com sucesso.`);
    }
  }
  
  if (shortcuts.batchSend) {
    const registeredBatchSend = globalShortcut.register(shortcuts.batchSend, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.batchSend} pressionado.`);
      sendBatchScreenshots();
    });
    if (!registeredBatchSend) {
      console.error(`Falha ao registrar atalho: ${shortcuts.batchSend}`);
    } else {
      console.log(`Atalho ${shortcuts.batchSend} registrado com sucesso.`);
    }
  }
}

async function captureScreen() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.error('Janela principal não encontrada ou destruída.');
      return;
    }

    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const scaleFactor = display.scaleFactor;

    console.log(`Janela em display ${display.id}. Bounds Janela: ${JSON.stringify(bounds)}, Bounds Display: ${JSON.stringify(display.bounds)}, ScaleFactor: ${scaleFactor}`);

    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    let imgBuffer;
    try {
       console.log(`Tentando capturar display específico: ${display.id}`);
       imgBuffer = await screenshot({ screen: display.id });
    } catch (captureErr) {
       console.warn(`Falha ao capturar display ${display.id}, tentando primária:`, captureErr);
       imgBuffer = await screenshot();
    }

    if (wasVisible) {
      mainWindow.show();
    }

    const cropX = Math.round((bounds.x - display.bounds.x) * scaleFactor);
    const cropY = Math.round((bounds.y - display.bounds.y) * scaleFactor);
    const cropWidth = Math.round(bounds.width * scaleFactor);
    const cropHeight = Math.round(bounds.height * scaleFactor);

    const cropBounds = {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
    };

    console.log(`Enviando para recorte. Bounds Calculados (físicos): ${JSON.stringify(cropBounds)}`);

    mainWindow.webContents.send('full-screenshot-info', {
      imgBase64: imgBuffer.toString('base64'),
      bounds: cropBounds
    });

  } catch (error) {
    console.error('Erro na captura de tela:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
         mainWindow.show();
      }
      mainWindow.webContents.send('screenshot-error', `Falha ao capturar/processar screenshot: ${error.message}`);
    }
  }
}

// Nova função para captura em lote
async function captureScreenToBatch() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.error('Janela principal não encontrada ou destruída.');
      return;
    }

    const bounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);
    const scaleFactor = display.scaleFactor;

    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    let imgBuffer;
    try {
      imgBuffer = await screenshot({ screen: display.id });
    } catch (captureErr) {
      console.warn(`Falha ao capturar display ${display.id}, tentando primária:`, captureErr);
      imgBuffer = await screenshot();
    }

    if (wasVisible) {
      mainWindow.show();
    }

    const cropX = Math.round((bounds.x - display.bounds.x) * scaleFactor);
    const cropY = Math.round((bounds.y - display.bounds.y) * scaleFactor);
    const cropWidth = Math.round(bounds.width * scaleFactor);
    const cropHeight = Math.round(bounds.height * scaleFactor);

    const screenshotItem = {
      imgBase64: imgBuffer.toString('base64'),
      bounds: {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight
      },
      timestamp: Date.now()
    };

    // Adiciona a screenshot ao lote
    screenshotBatch.push(screenshotItem);
    
    // Notifica a interface sobre a nova captura
    mainWindow.webContents.send('batch-screenshot-added', {
      count: screenshotBatch.length,
      timestamp: screenshotItem.timestamp
    });
    
  } catch (error) {
    console.error('Erro na captura para lote:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screenshot-error', `Falha ao capturar para lote: ${error.message}`);
    }
  }
}

// Função para enviar as capturas em lote
function sendBatchScreenshots() {
  if (screenshotBatch.length === 0) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('batch-empty');
    }
    return;
  }
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('batch-screenshots', screenshotBatch);
    // Não limpa o lote automaticamente para permitir reprocessamento
    // Se quiser limpar, descomente a linha abaixo
    // screenshotBatch = [];
  }
}

app.whenReady().then(createWindow);

ipcMain.handle('capture-screen', () => {
  return captureScreen();
});

ipcMain.handle('get-api-key', () => {
  const encryptedKey = store.get('apiKey');
  if (!encryptedKey) return null;
  try {
    return CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar API key:', error);
    return null;
  }
});

ipcMain.handle('save-api-key', (event, apiKey) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
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

ipcMain.handle('get-cloudflare-account-id', () => {
  const encryptedId = store.get('cloudflareAccountId');
  if (!encryptedId) return null;
  try {
    return CryptoJS.AES.decrypt(encryptedId, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar Cloudflare Account ID:', error);
    return null;
  }
});

ipcMain.handle('save-cloudflare-account-id', (event, accountId) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(accountId, ENCRYPTION_KEY).toString();
    store.set('cloudflareAccountId', encrypted);
    return true;
  } catch (error) {
    console.error('Erro ao salvar Cloudflare Account ID:', error);
    return false;
  }
});

ipcMain.handle('get-cloudflare-api-token', () => {
  const encryptedToken = store.get('cloudflareApiToken');
  if (!encryptedToken) return null;
  try {
    return CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar Cloudflare API Token:', error);
    return null;
  }
});

ipcMain.handle('save-cloudflare-api-token', (event, apiToken) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(apiToken, ENCRYPTION_KEY).toString();
    store.set('cloudflareApiToken', encrypted);
    return true;
  } catch (error) {
    console.error('Erro ao salvar Cloudflare API Token:', error);
    return false;
  }
});

// Novos handlers para o sistema de lote
ipcMain.handle('clear-batch', () => {
  screenshotBatch = [];
  return true;
});

ipcMain.handle('get-batch-count', () => {
  return screenshotBatch.length;
});

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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

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