import React, { useState, useEffect } from 'react';
import './App.css';
import OCRService from './services/OCRService';
import AIService from './services/AIService';
import ShortcutSettings from './components/ShortcutSettings';
import AntiDetection from './utils/anti-detection';

function App() {
  const [screenshot, setScreenshot] = useState(null);
  const [text, setText] = useState('');
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState('');
  const [antiDetectionMode, setAntiDetectionMode] = useState(true); // Inicia em modo camuflado
  const [shortcuts, setShortcuts] = useState({});

  useEffect(() => {
    // Carrega configurações
    loadSettings();
    
    // Listeners para eventos
    window.electronAPI.onScreenshotCaptured((imgData) => {
      setScreenshot(`data:image/png;base64,${imgData}`);
      processImage(imgData);
    });

    window.electronAPI.onScreenshotError((message) => {
      setError(`Erro na captura: ${message}`);
      setTimeout(() => setError(''), 3000);
    });

    // Atalhos de teclado
    document.addEventListener('keydown', handleKeyPress);
    
    // Ativa modo camuflado por padrão
    toggleAntiDetectionMode(true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const loadSettings = async () => {
    try {
      // Carrega API key
      const key = await window.electronAPI.getApiKey();
      if (key) setApiKey(key);
      
      // Carrega atalhos
      const savedShortcuts = await window.electronAPI.getShortcuts();
      setShortcuts(savedShortcuts || {});
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleKeyPress = (e) => {
    // Implementa os atalhos de teclado personalizados
    if (e.altKey && e.key === '1') {
      setOpacity(0.3);
    } else if (e.altKey && e.key === '2') {
      setOpacity(0.6);
    } else if (e.altKey && e.key === '3') {
      setOpacity(1);
    }
  };

  const processImage = async (imgData) => {
    setIsProcessing(true);
    setSolution('');
    
    try {
      // Extrai texto da imagem
      const extractedText = await OCRService.extractText(imgData);
      setText(extractedText);
      
      // Gera solução via API
      if (apiKey && extractedText) {
        const aiSolution = await AIService.generateSolution(extractedText, apiKey);
        setSolution(aiSolution);
      } else if (!apiKey) {
        setSolution('Configure uma API key válida nas configurações.');
      } else {
        setSolution('Não foi possível extrair texto da imagem.');
      }
    } catch (error) {
      console.error('Erro no processamento:', error);
      setSolution('Erro ao processar imagem. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveSettings = async () => {
    await window.electronAPI.saveApiKey(apiKey);
    setShowSettings(false);
  };

  const captureManually = () => {
    window.electronAPI.captureScreen();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(solution);
    
    // Feedback visual temporário
    const btn = document.getElementById('copy-btn');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = '✓';
      setTimeout(() => {
        btn.innerText = originalText;
      }, 1000);
    }
  };

  const toggleAntiDetectionMode = (forceActivate = null) => {
    const newMode = forceActivate !== null ? forceActivate : !antiDetectionMode;
    setAntiDetectionMode(newMode);
    
    // Camufla o app
    AntiDetection.activateCamouflage(newMode);
  };

  return (
    <div className="app" style={{ opacity }}>
      {showShortcuts ? (
        <ShortcutSettings 
          onClose={() => setShowShortcuts(false)} 
          shortcuts={shortcuts}
          setShortcuts={setShortcuts}
        />
      ) : showSettings ? (
        <div className="settings-modal">
          <h3>Configurações</h3>
          
          <div className="input-group">
            <label htmlFor="api-key">API Key Gemini</label>
            <input 
              id="api-key"
              type="password" 
              placeholder="Insira sua API Key" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          
          <div className="shortcut-info">
            <p>Atalhos Configurados</p>
            <div className="shortcut-item">
              <span>Capturar tela:</span>
              <span>{shortcuts.capture || 'Alt+S'}</span>
            </div>
            <div className="shortcut-item">
              <span>Mostrar/ocultar app:</span>
              <span>{shortcuts.toggle || 'Alt+H'}</span>
            </div>
            <div className="shortcut-item">
              <span>Opacidade 30%:</span>
              <span>{shortcuts.opacity30 || 'Alt+1'}</span>
            </div>
            <div className="shortcut-item">
              <span>Opacidade 60%:</span>
              <span>{shortcuts.opacity60 || 'Alt+2'}</span>
            </div>
            <div className="shortcut-item">
              <span>Opacidade 100%:</span>
              <span>{shortcuts.opacity100 || 'Alt+3'}</span>
            </div>
            
            <button 
              className="configure-shortcuts-btn" 
              onClick={() => setShowShortcuts(true)}
            >
              Configurar Atalhos
            </button>
          </div>
          
          <div className="button-group">
            <button className="btn-primary" onClick={saveSettings}>Salvar</button>
            <button className="btn-secondary" onClick={() => setShowSettings(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="main-interface">
          <div className="header">
            <span className="header-title">Assistente Discreto</span>
            <div className="header-buttons">
              <button 
                id="copy-btn"
                onClick={copyToClipboard} 
                disabled={!solution}
                title="Copiar solução"
              >
                📋
              </button>
              <button 
                onClick={() => toggleAntiDetectionMode()}
                title={antiDetectionMode ? "Desativar modo camuflado" : "Ativar modo camuflado"}
                style={{color: antiDetectionMode ? '#10b981' : '#ff3333'}}
              >
                {antiDetectionMode ? '●' : '⊗'}
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                title="Configurações"
              >
                ⚙️
              </button>
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          
          {screenshot && (
            <div className="preview">
              <img src={screenshot} alt="Captura" />
            </div>
          )}
          
          <div className="main-content">
            <div className="solution-area">
              {isProcessing ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                solution && <pre className="solution-content">{solution}</pre>
              )}
            </div>
            
            <div className="control-bar">
              <button 
                className="capture-btn" 
                onClick={captureManually}
                disabled={isProcessing}
              >
                <span>📷</span>
                <span>Capturar ({shortcuts.capture || 'Alt+S'})</span>
              </button>
              
              <div className="opacity-controls">
                <button 
                  className={`opacity-btn ${opacity === 0.3 ? 'active' : ''}`}
                  onClick={() => setOpacity(0.3)}
                  title="Opacidade 30%"
                >
                  1
                </button>
                <button 
                  className={`opacity-btn ${opacity === 0.6 ? 'active' : ''}`}
                  onClick={() => setOpacity(0.6)}
                  title="Opacidade 60%"
                >
                  2
                </button>
                <button 
                  className={`opacity-btn ${opacity === 1 ? 'active' : ''}`}
                  onClick={() => setOpacity(1)}
                  title="Opacidade 100%"
                >
                  3
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;