const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveCloudflareHash: (hash) => ipcRenderer.invoke('save-cloudflare-hash', hash),
  getCloudflareHash: () => ipcRenderer.invoke('get-cloudflare-hash'),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  onScreenshotCaptured: (callback) =>
    ipcRenderer.on('screenshot-captured', (event, value) => callback(value)),
  onScreenshotError: (callback) =>
    ipcRenderer.on('screenshot-error', (event, message) => callback(message))
});