const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CryptoJS = require('crypto-js');

// Configuração básica sem opções para compatibilidade
const store = new Store();

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
   skipTaskbar: true
 });

 if (process.argv.includes('--dev')) {
  mainWindow.loadURL('http://localhost:5555');
} else {
  mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
}

 registerShortcuts();
}

function registerShortcuts() {
 globalShortcut.register('Alt+S', () => {
   captureScreen();
 });
 
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

ipcMain.handle('get-api-key', () => {
 const encryptedKey = store.get('apiKey');
 if (!encryptedKey) return null;
 
 return CryptoJS.AES.decrypt(encryptedKey, 'sua-chave-segura').toString(CryptoJS.enc.Utf8);
});

ipcMain.handle('save-api-key', (event, apiKey) => {
 const encrypted = CryptoJS.AES.encrypt(apiKey, 'sua-chave-segura').toString();
 store.set('apiKey', encrypted);
});

app.on('will-quit', () => {
 globalShortcut.unregisterAll();
});