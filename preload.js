const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  onScreenshotCaptured: (callback) =>
    ipcRenderer.on('screenshot-captured', (event, value) => callback(value)),
  onFullScreenshotInfo: (callback) =>
    ipcRenderer.on('full-screenshot-info', (event, data) => callback(data)),
  onScreenshotError: (callback) =>
    ipcRenderer.on('screenshot-error', (event, message) => callback(message)),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  
  // Supabase
  saveSupabaseUrl: (url) => ipcRenderer.invoke('save-supabase-url', url),
  getSupabaseUrl: () => ipcRenderer.invoke('get-supabase-url'),
  saveSupabaseKey: (key) => ipcRenderer.invoke('save-supabase-key', key),
  getSupabaseKey: () => ipcRenderer.invoke('get-supabase-key'),
  
  // Batch processing
  onBatchScreenshotAdded: (callback) =>
    ipcRenderer.on('batch-screenshot-added', (event, data) => callback(data)),
  onBatchScreenshots: (callback) =>
    ipcRenderer.on('batch-screenshots', (event, data) => callback(data)),
  onBatchEmpty: (callback) =>
    ipcRenderer.on('batch-empty', (event) => callback()),
  clearBatch: () => ipcRenderer.invoke('clear-batch'),
  getBatchCount: () => ipcRenderer.invoke('get-batch-count')
});