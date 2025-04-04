const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
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
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  }

  mainWindow.setHasShadow(false);
  registerShortcuts();
}

function registerShortcuts() {
  globalShortcut.unregisterAll(); // Limpa atalhos anteriores

  const shortcuts = store.get('shortcuts') || DEFAULT_SHORTCUTS;
  console.log('Registrando atalhos:', shortcuts); // Log para ver quais atalhos estão sendo lidos

  if (shortcuts.capture) {
    if (globalShortcut.isRegistered(shortcuts.capture)) {
         console.warn(`Atalho ${shortcuts.capture} já registrado? Tentando registrar novamente.`);
    }
    const registeredCapture = globalShortcut.register(shortcuts.capture, () => {
      console.log(`Atalho ${shortcuts.capture} pressionado - Capturando tela`);
      captureScreen();
    });
     if (!registeredCapture) {
        console.error(`Falha ao registrar atalho: ${shortcuts.capture}`);
     } else {
        console.log(`Atalho ${shortcuts.capture} registrado com sucesso.`);
     }
  }

  if (shortcuts.toggle) {
     if (globalShortcut.isRegistered(shortcuts.toggle)) {
         console.warn(`Atalho ${shortcuts.toggle} já registrado? Tentando registrar novamente.`);
     }
    const registeredToggle = globalShortcut.register(shortcuts.toggle, () => {
       console.log(`Atalho ${shortcuts.toggle} pressionado - Alternando visibilidade`);
      if (mainWindow && !mainWindow.isDestroyed()) {
         mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      } else {
         console.error('mainWindow não definida ou destruída ao tentar alternar visibilidade.');
      }
    });
     if (!registeredToggle) {
        console.error(`Falha ao registrar atalho: ${shortcuts.toggle}`);
     } else {
        console.log(`Atalho ${shortcuts.toggle} registrado com sucesso.`);
     }
  }

  // Registra atalhos de opacidade com logs
  if (shortcuts.opacity30) {
     if (globalShortcut.isRegistered(shortcuts.opacity30)) {
         console.warn(`Atalho ${shortcuts.opacity30} já registrado? Tentando registrar novamente.`);
     }
    const registeredOp30 = globalShortcut.register(shortcuts.opacity30, () => {
      console.log(`Atalho ${shortcuts.opacity30} pressionado - Definindo opacidade para 0.3`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOpacity(0.3);
      } else {
        console.error('mainWindow não definida ou destruída ao tentar setar opacidade 0.3.');
      }
    });
     if (!registeredOp30) {
        console.error(`Falha ao registrar atalho: ${shortcuts.opacity30}`);
     } else {
        console.log(`Atalho ${shortcuts.opacity30} registrado com sucesso.`);
     }
  }

  if (shortcuts.opacity60) {
     if (globalShortcut.isRegistered(shortcuts.opacity60)) {
         console.warn(`Atalho ${shortcuts.opacity60} já registrado? Tentando registrar novamente.`);
     }
    const registeredOp60 = globalShortcut.register(shortcuts.opacity60, () => {
      console.log(`Atalho ${shortcuts.opacity60} pressionado - Definindo opacidade para 0.6`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOpacity(0.6);
      } else {
         console.error('mainWindow não definida ou destruída ao tentar setar opacidade 0.6.');
      }
    });
     if (!registeredOp60) {
        console.error(`Falha ao registrar atalho: ${shortcuts.opacity60}`);
     } else {
        console.log(`Atalho ${shortcuts.opacity60} registrado com sucesso.`);
     }
  }

  if (shortcuts.opacity100) {
     if (globalShortcut.isRegistered(shortcuts.opacity100)) {
         console.warn(`Atalho ${shortcuts.opacity100} já registrado? Tentando registrar novamente.`);
     }
    const registeredOp100 = globalShortcut.register(shortcuts.opacity100, () => {
      console.log(`Atalho ${shortcuts.opacity100} pressionado - Definindo opacidade para 1.0`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setOpacity(1.0);
      } else {
         console.error('mainWindow não definida ou destruída ao tentar setar opacidade 1.0.');
      }
    });
     if (!registeredOp100) {
        console.error(`Falha ao registrar atalho: ${shortcuts.opacity100}`);
     } else {
        console.log(`Atalho ${shortcuts.opacity100} registrado com sucesso.`);
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