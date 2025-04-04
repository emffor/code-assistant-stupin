const { contextBridge, ipcRenderer } = require('electron');

// Exponha APIs específicas e limitadas para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  onScreenshotCaptured: (callback) => 
    ipcRenderer.on('screenshot-captured', (event, value) => callback(value))
});