const { contextBridge, ipcRenderer } = require('electron');

// Exponha APIs específicas e limitadas para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
  // Funções de captura de tela
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  
  // Funções de gerenciamento de API key
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  
  // Funções de gerenciamento de atalhos
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  
  // Event listeners
  onScreenshotCaptured: (callback) => 
    ipcRenderer.on('screenshot-captured', (event, value) => callback(value)),
  onScreenshotError: (callback) =>
    ipcRenderer.on('screenshot-error', (event, message) => callback(message))
});