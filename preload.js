const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  onScreenshotCaptured: (callback) => {
    const channel = ipcRenderer.on('screenshot-captured', (_, value) => callback(value));
    return () => ipcRenderer.removeListener('screenshot-captured', channel);
  }
});