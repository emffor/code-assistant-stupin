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
    <div className="app-container">
      {showSettings ? (
        <div className="settings-container">
          <h2>Configurações</h2>
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
        <div className="main-container">
          <header>
            <h1>Assistente Discreto</h1>
            <button onClick={() => setShowSettings(true)}>⚙️</button>
          </header>
          
          {screenshot && (
            <div className="screenshot-preview">
              <img src={screenshot} alt="Screenshot" />
            </div>
          )}
          
          <div className="solution-container">
            {isProcessing ? (
              <p>Processando...</p>
            ) : (
              solution && <div>{solution}</div>
            )}
          </div>
          
          <div className="button-container">
            <button onClick={captureManually}>Capturar (Alt+S)</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;