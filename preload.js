const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  onScreenshotCaptured: (callback) =>
    ipcRenderer.on('screenshot-captured', (event, value) => callback(value)),
  onScreenshotError: (callback) =>
    ipcRenderer.on('screenshot-error', (event, message) => callback(message)),

  saveCloudflareAccountId: (id) => ipcRenderer.invoke('save-cloudflare-account-id', id),
  getCloudflareAccountId: () => ipcRenderer.invoke('get-cloudflare-account-id'),
  saveCloudflareApiToken: (token) => ipcRenderer.invoke('save-cloudflare-api-token', token),
  getCloudflareApiToken: () => ipcRenderer.invoke('get-cloudflare-api-token')
});