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
    // --- MODIFICAÇÕES AQUI ---
    frame: true,        // Adicionado: Mostra a moldura padrão da janela
    transparent: false, // Modificado: Janela deixa de ser transparente
    // --- FIM DAS MODIFICAÇÕES ---
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    skipTaskbar: true,
    alwaysOnTop: true // Pode ser necessário remover se frame:true causar problemas
  });

  // Descomente a linha abaixo se o problema persistir, para testar
  // app.disableHardwareAcceleration();

  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5555');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  }

  // mainWindow.setHasShadow(false); // Com frame:true, a sombra é gerenciada pelo OS
  registerShortcuts();
}

// Função registerShortcuts (com logs de debug) permanece a mesma da resposta anterior
function registerShortcuts() {
  globalShortcut.unregisterAll();

  const shortcuts = store.get('shortcuts') || DEFAULT_SHORTCUTS;
  console.log('[DEBUG] Registrando atalhos lidos:', JSON.stringify(shortcuts));

  const testShortcut = 'Ctrl+Shift+F11';
  console.log(`[DEBUG] Tentando registrar atalho de teste: ${testShortcut}`);
  const registeredTest = globalShortcut.register(testShortcut, () => {
    console.log(`[DEBUG] Atalho de TESTE ${testShortcut} pressionado!`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentOpacity = mainWindow.getOpacity();
      const newOpacity = currentOpacity < 0.7 ? 0.8 : 0.4;
      console.log(`[DEBUG] Opacidade atual: ${currentOpacity}, Definindo opacidade de TESTE para ${newOpacity}`);
      try {
        mainWindow.setOpacity(newOpacity);
        console.log(`[DEBUG] Opacidade de TESTE definida com sucesso.`);
      } catch (err) {
        console.error(`[DEBUG] Erro ao definir opacidade de TESTE: ${err}`);
      }
    } else {
      console.error('[DEBUG] TESTE: mainWindow não definida ou destruída ao tentar setar opacidade.');
    }
  });
  if (!registeredTest) {
    console.error(`[DEBUG] Falha ao registrar atalho de TESTE: ${testShortcut}. Verifique conflitos.`);
  } else {
    console.log(`[DEBUG] Atalho de TESTE ${testShortcut} registrado com sucesso.`);
  }


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
           console.log('[CALLBACK] Alternando visibilidade.')
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

  if (shortcuts.opacity30) {
    const registeredOp30 = globalShortcut.register(shortcuts.opacity30, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.opacity30} pressionado.`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log(`[CALLBACK] Setando opacidade para 0.3`);
        try {
            mainWindow.setOpacity(0.3);
            console.log(`[CALLBACK] Opacidade 0.3 definida com sucesso.`);
        } catch (err) {
             console.error(`[CALLBACK] Erro ao definir opacidade 0.3: ${err}`);
        }
      } else {
        console.error('[CALLBACK] mainWindow não definida ou destruída ao tentar setar opacidade 0.3.');
      }
    });
     if (!registeredOp30) {
        console.error(`Falha ao registrar atalho: ${shortcuts.opacity30}`);
     } else {
        console.log(`Atalho ${shortcuts.opacity30} registrado com sucesso.`);
     }
  }

  if (shortcuts.opacity60) {
    const registeredOp60 = globalShortcut.register(shortcuts.opacity60, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.opacity60} pressionado.`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log(`[CALLBACK] Setando opacidade para 0.6`);
         try {
            mainWindow.setOpacity(0.6);
            console.log(`[CALLBACK] Opacidade 0.6 definida com sucesso.`);
        } catch (err) {
             console.error(`[CALLBACK] Erro ao definir opacidade 0.6: ${err}`);
        }
      } else {
         console.error('[CALLBACK] mainWindow não definida ou destruída ao tentar setar opacidade 0.6.');
      }
    });
     if (!registeredOp60) {
        console.error(`Falha ao registrar atalho: ${shortcuts.opacity60}`);
     } else {
        console.log(`Atalho ${shortcuts.opacity60} registrado com sucesso.`);
     }
  }

  if (shortcuts.opacity100) {
    const registeredOp100 = globalShortcut.register(shortcuts.opacity100, () => {
      console.log(`[CALLBACK] Atalho ${shortcuts.opacity100} pressionado.`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log(`[CALLBACK] Setando opacidade para 1.0`);
         try {
            mainWindow.setOpacity(1.0);
            console.log(`[CALLBACK] Opacidade 1.0 definida com sucesso.`);
        } catch (err) {
             console.error(`[CALLBACK] Erro ao definir opacidade 1.0: ${err}`);
        }
      } else {
         console.error('[CALLBACK] mainWindow não definida ou destruída ao tentar setar opacidade 1.0.');
      }
    });
     if (!registeredOp100) {
        console.error(`Falha ao registrar atalho: ${shortcuts.opacity100}`);
     } else {
        console.log(`Atalho ${shortcuts.opacity100} registrado com sucesso.`);
     }
  }
}

// Função captureScreen permanece a mesma
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
      // Para janelas com frame, talvez não precise esconder para capturar
      // mainWindow.hide();
      // await new Promise(resolve => setTimeout(resolve, 150));
    }

    let imgBuffer;
    try {
       console.log(`Tentando capturar display específico: ${display.id}`);
       // Captura de janela com frame pode precisar ser ajustada
       // Talvez capturar a tela inteira e depois recortar a área da janela
       // ou usar API específica para capturar conteúdo da janela.
       // Por simplicidade, vamos manter a captura de tela inteira por enquanto.
       imgBuffer = await screenshot({ screen: display.id });
       // Alternativa: capturar apenas a janela (pode não funcionar bem com frame:true em alguns OS)
       // imgBuffer = await screenshot({ window: mainWindow.getNativeWindowHandle() });
    } catch (captureErr) {
       console.warn(`Falha ao capturar display ${display.id}, tentando primária:`, captureErr);
       imgBuffer = await screenshot();
    }

    if (wasVisible /*&& !mainWindow.isVisible()*/) { // Ajuste se não escondeu
      // mainWindow.show();
    }

    // O recorte pode precisar ser ajustado se a captura for da janela em vez da tela
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


// Restante do código (ipcMain handlers, app events) permanece o mesmo
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