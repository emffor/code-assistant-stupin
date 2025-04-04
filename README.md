# Assistente de Código Discreto - Implementação

## 1. Configuração Inicial

```bash
mkdir code-assistant
cd code-assistant
npm init -y
npm install electron electron-builder react react-dom react-router-dom electron-store crypto-js node-tesseract-ocr screenshot-desktop
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
class AIService {
  static async generateSolution(codeText, apiKey) {
    // Uso de Cloudflare Worker como proxy
    const PROXY_URL = 'https://seu-worker.seu-nome.workers.dev';
    
    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey // Enviado no header mas interceptado pelo worker
        },
        body: JSON.stringify({
          text: codeText,
          model: 'gemini-pro'
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha na API');
      }
      
      const data = await response.json();
      return data.solution;
    } catch (error) {
      console.error('Erro API:', error);
      return 'Não foi possível gerar uma solução.';
    }
  }
}

export default AIService;
```

## 5. Worker Cloudflare (proxy.js)
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
    'Content-Type': 'application/json'
  }
  
  // Responde ao preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }
  
  try {
    // Extrai dados da solicitação
    const apiKey = request.headers.get('X-API-Key')
    const { text } = await request.json()
    
    // Chamada para API Gemini (Google AI)
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analise este código e sugira uma solução para o problema. Seja conciso e direto:\n\n${text}`
          }]
        }]
      })
    })
    
    const geminiData = await geminiResponse.json()
    
    // Extrai o texto da resposta
    const solution = geminiData.candidates[0].content.parts[0].text
    
    return new Response(
      JSON.stringify({ solution }),
      { headers }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Falha no processamento' }),
      { status: 500, headers }
    )
  }
}
```

## 6. Estilo CSS Básico
```css
/* src/App.css */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
  overflow: hidden;
}

.app {
  background-color: rgba(30, 30, 30, 0.9);
  color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  width: 100vw;
  height: 100vh;
  -webkit-app-region: drag; /* Permite mover a janela */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: rgba(20, 20, 20, 0.8);
}

.header button {
  -webkit-app-region: no-drag; /* Permite clicar no botão */
  background: none;
  border: none;
  color: #ddd;
  cursor: pointer;
}

.preview {
  padding: 10px;
  text-align: center;
  max-height: 150px;
  overflow: hidden;
}

.preview img {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
  border-radius: 4px;
}

.solution-area {
  padding: 10px;
  margin: 5px;
  background-color: rgba(40, 40, 40, 0.7);
  border-radius: 4px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.solution-area pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.capture-btn {
  -webkit-app-region: no-drag;
  display: block;
  margin: 10px auto;
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.capture-btn:hover {
  background-color: #0069d9;
}

.capture-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.settings-modal {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.settings-modal input {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #444;
  background-color: #333;
  color: white;
}

.settings-modal button {
  -webkit-app-region: no-drag;
  padding: 8px;
  border-radius: 4px;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  margin-top: 5px;
}
```

## 7. Empacotamento
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

## 8. Próximos Passos

1. Implementar interface React completa
2. Adicionar transição de opacidade para modo discreto
3. Implementar os atalhos personalizáveis
4. Refinar o processamento OCR para código
5. Adicionar modo de análise de código
6. Implementar técnicas anti-detecção