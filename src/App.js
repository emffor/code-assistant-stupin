import React, { useState, useEffect } from 'react';
import './App.css';
import OCRService from './services/OCRService';
import AIService from './services/AIService';
import ShortcutSettings from './components/ShortcutSettings';

function App() {
  const [screenshot, setScreenshot] = useState(null);
  const [text, setText] = useState('');
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [opacity, setOpacity] = useState(1); // Controle de opacidade
  const [error, setError] = useState('');

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

    // Listener para erros de captura
    window.electronAPI.onScreenshotError((message) => {
      setError(`Erro na captura: ${message}`);
      setTimeout(() => setError(''), 3000);
    });

    // Atalhos de teclado para opacidade
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      window.electronAPI.onScreenshotError(null);
    };
  }, []);

  const handleKeyPress = (e) => {
    // Alt+1: Opacidade baixa (30%)
    if (e.altKey && e.key === '1') {
      setOpacity(0.3);
    }
    // Alt+2: Opacidade média (60%)
    else if (e.altKey && e.key === '2') {
      setOpacity(0.6);
    }
    // Alt+3: Opacidade total (100%)
    else if (e.altKey && e.key === '3') {
      setOpacity(1);
    }
  };

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
      setSolution('Erro ao processar imagem. Tente novamente.');
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(solution);
  };

  return (
    <div className="app" style={{ opacity }}>
      {showShortcuts ? (
        <ShortcutSettings onClose={() => setShowShortcuts(false)} />
      ) : showSettings ? (
        <div className="settings-modal">
          <h3>Configurações</h3>
          <input 
            type="password" 
            placeholder="API Key Gemini" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <div className="shortcut-info">
            <p>Atalhos:</p>
            <button 
              className="configure-shortcuts-btn" 
              onClick={() => setShowShortcuts(true)}
            >
              Configurar Atalhos
            </button>
          </div>
          <div className="button-group">
            <button onClick={saveSettings}>Salvar</button>
            <button onClick={() => setShowSettings(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="main-interface">
          <div className="header">
            <span>Assistente Discreto</span>
            <div className="header-buttons">
              <button onClick={copyToClipboard} disabled={!solution}>📋</button>
              <button onClick={() => setShowSettings(true)}>⚙️</button>
            </div>
          </div>
          
          {screenshot && (
            <div className="preview">
              <img src={screenshot} alt="Captura" />
            </div>
          )}
          
          <div className="solution-area">
            {isProcessing ? (
              <div className="loading">Processando...</div>
            ) : (
              solution && <pre className="solution-content">{solution}</pre>
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