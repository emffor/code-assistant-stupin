const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CryptoJS = require('crypto-js');
const screenshot = require('screenshot-desktop');

const store = new Store({
  encryptionKey: 'app-secretkey-changethis',
  name: 'settings'
});

const DEFAULT_SHORTCUTS = {
  capture: 'Alt+S',
  toggle: 'Alt+H',
  opacity30: 'Alt+1',
  opacity60: 'Alt+2',
  opacity100: 'Alt+3',
};

const ENCRYPTION_KEY = 'app-secretkey-changethis';

let mainWindow;

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
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  }

  mainWindow.setHasShadow(false);
  registerShortcuts();
}

function registerShortcuts() {
  globalShortcut.unregisterAll();
  const shortcuts = store.get('shortcuts') || DEFAULT_SHORTCUTS;

  if (shortcuts.capture) {
    globalShortcut.register(shortcuts.capture, () => {
      captureScreen();
    });
  }

  if (shortcuts.toggle) {
    globalShortcut.register(shortcuts.toggle, () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  }

  // Opacity shortcuts remain the same
  if (shortcuts.opacity30) {
      globalShortcut.register(shortcuts.opacity30, () => mainWindow.setOpacity(0.3));
  }
  if (shortcuts.opacity60) {
      globalShortcut.register(shortcuts.opacity60, () => mainWindow.setOpacity(0.6));
  }
  if (shortcuts.opacity100) {
      globalShortcut.register(shortcuts.opacity100, () => mainWindow.setOpacity(1.0));
  }
}


async function captureScreen() {
  try {
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
      mainWindow.hide();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const img = await screenshot();

    if (wasVisible) {
      mainWindow.show();
    }

    mainWindow.webContents.send('screenshot-captured', img.toString('base64'));
  } catch (error) {
    console.error('Erro na captura:', error);
    mainWindow.webContents.send('screenshot-error', error.message);
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

// Handlers for Cloudflare Account ID
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

// Handlers for Cloudflare API Token
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