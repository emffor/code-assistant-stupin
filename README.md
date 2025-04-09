# Assistente de Código Discreto - Implementação

## 1. Configuração Inicial

```bash
mkdir code-assistant
cd code-assistant
npm init -y
npm install electron electron-builder react react-dom react-router-dom electron-store crypto-js node-tesseract-ocr screenshot-desktop @supabase/supabase-js
```

## 2. Estrutura de Arquivos

```
code-assistant/
├── package.json
├── main.js            # Processo principal Electron
├── preload.js         # Script de preload seguro
├── src/
│   ├── index.js       # Ponto de entrada React
│   ├── App.js         # Componente principal
│   ├── components/    # Componentes React
│   ├── services/      # Serviços (captura, OCR, API)
│   └── utils/         # Utilitários
└── assets/            # Ícones e recursos
```

## 3. Implementação Base

### main.js - Processo Principal
```javascript
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CryptoJS = require('crypto-js');

// Configuração de armazenamento criptografado
const store = new Store({
  encryptionKey: 'sua-chave-segura',
  name: 'config'
});

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
    skipTaskbar: true // Oculta da barra de tarefas
  });

  // Carrega a interface React
  mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  
  // Modo de desenvolvimento
  // mainWindow.webContents.openDevTools();
  
  // Registra atalho global para captura (Alt+S)
  registerShortcuts();
}

function registerShortcuts() {
  // Captura de tela
  globalShortcut.register('Alt+S', () => {
    captureScreen();
  });
  
  // Mostrar/ocultar aplicativo
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

// Comunicação IPC segura
ipcMain.handle('get-api-key', () => {
  const encryptedKey = store.get('apiKey');
  if (!encryptedKey) return null;
  
  return CryptoJS.AES.decrypt(encryptedKey, 'sua-chave-segura').toString(CryptoJS.enc.Utf8);
});

ipcMain.handle('save-api-key', (event, apiKey) => {
  const encrypted = CryptoJS.AES.encrypt(apiKey, 'sua-chave-segura').toString();
  store.set('apiKey', encrypted);
});

// Limpa atalhos ao sair
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
```

### preload.js - Preload Seguro
```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Exponha APIs específicas e limitadas para o processo de renderização
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  onScreenshotCaptured: (callback) => 
    ipcRenderer.on('screenshot-captured', (event, value) => callback(value))
});
```

### src/App.js - Interface Principal
```javascript
import React, { useState, useEffect } from 'react';
import './App.css';
import OCRService from './services/OCRService';
import AIService from './services/AIService';

function App() {
  const [screenshot, setScreenshot] = useState(null);
  const [text, setText] = useState('');
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Carrega a API key salva
    window.electronAPI.getApiKey().then(key => {
      if (key) setApiKey(key);
    });
    
    // Listener para capturas de tela
    window.electronAPI.onScreenshotCaptured((imgData) => {
      setScreenshot(`data:image/png;base64,${imgData}`);
      processImage(imgData);
    });
  }, []);

  const processImage = async (imgData) => {
    setIsProcessing(true);
    try {
      // Extrai texto da imagem
      const extractedText = await OCRService.extractText(imgData);
      setText(extractedText);
      
      // Gera solução via API
      if (apiKey && extractedText) {
        const aiSolution = await AIService.generateSolution(extractedText, apiKey);
        setSolution(aiSolution);
      }
    } catch (error) {
      console.error('Erro no processamento:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveSettings = () => {
    window.electronAPI.saveApiKey(apiKey);
    setShowSettings(false);
  };

  const captureManually = () => {
    window.electronAPI.captureScreen();
  };

  return (
    <div className="app">
      {showSettings ? (
        <div className="settings-modal">
          <h3>Configurações</h3>
          <input 
            type="password" 
            placeholder="API Key Gemini" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button onClick={saveSettings}>Salvar</button>
          <button onClick={() => setShowSettings(false)}>Cancelar</button>
        </div>
      ) : (
        <div className="main-interface">
          <div className="header">
            <span>Assistente Discreto</span>
            <button onClick={() => setShowSettings(true)}>⚙️</button>
          </div>
          
          {screenshot && (
            <div className="preview">
              <img src={screenshot} alt="Captura" width="200" />
            </div>
          )}
          
          <div className="solution-area">
            {isProcessing ? (
              <p>Processando...</p>
            ) : (
              solution && <pre>{solution}</pre>
            )}
          </div>
          
          <button 
            className="capture-btn" 
            onClick={captureManually}
            disabled={isProcessing}
          >
            Capturar (Alt+S)
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
```

## 4. Serviços

### src/services/OCRService.js
```javascript
import Tesseract from 'tesseract.js';

class OCRService {
  static async extractText(imageData) {
    try {
      const result = await Tesseract.recognize(
        `data:image/png;base64,${imageData}`,
        'eng',
        { logger: m => console.log(m) }
      );
      
      return result.data.text;
    } catch (error) {
      console.error('Erro OCR:', error);
      throw error;
    }
  }
}

export default OCRService;
```

### src/services/AIService.js
```javascript
import { createClient } from '@supabase/supabase-js';

class AIService {
  static async uploadToSupabase(imgBase64Data) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;
      const supabaseBucket = process.env.SUPABASE_BUCKET || 'screenshots';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const blob = await fetch(`data:image/png;base64,${imgBase64Data}`).then(res => res.blob());
      const fileName = `screenshot_${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      
      const { data: urlData } = supabase.storage
        .from(supabaseBucket)
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro no upload para Supabase:', error);
      throw error;
    }
  }

  static async generateSolutionFromUrl(imageUrl, apiKey) {
    // Chamada direta para API Gemini
    try {
      const imageBase64 = await this.getImageAsBase64(imageUrl);
      
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Analise esta imagem de código e sugira uma solução para o problema. Seja conciso e direto." },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: imageBase64
                }
              }
            ]
          }]
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha na API Gemini');
      }
      
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Erro API:', error);
      return 'Não foi possível gerar uma solução.';
    }
  }
  
  static async getImageAsBase64(imageUrl) {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return this.arrayBufferToBase64(arrayBuffer);
  }
  
  static arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export default AIService;
```

## 5. Empacotamento
Adicione ao package.json:

```json
"scripts": {
  "start": "electron .",
  "build": "react-scripts build",
  "dist": "electron-builder"
},
"build": {
  "appId": "com.discreet.codeassistant",
  "productName": "Code Assistant",
  "directories": {
    "output": "dist"
  },
  "files": [
    "build/**/*",
    "main.js",
    "preload.js",
    "assets/**/*"
  ],
  "win": {
    "target": "portable",
    "icon": "assets/icon.ico"
  },
  "mac": {
    "target": "dmg",
    "icon": "assets/icon.icns"
  }
}
```

## 6. Próximos Passos

1. Implementar interface React completa
2. Adicionar transição de opacidade para modo discreto
3. Implementar os atalhos personalizáveis
4. Refinar o processamento OCR para código
5. Adicionar modo de análise de código
6. Implementar técnicas anti-detecção