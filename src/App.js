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
  const [cloudflareHash, setCloudflareHash] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState('');
  const [antiDetectionMode, setAntiDetectionMode] = useState(true);
  const [shortcuts, setShortcuts] = useState({});

  useEffect(() => {
    loadSettings();

    window.electronAPI.onScreenshotCaptured((imgData) => {
      setScreenshot(`data:image/png;base64,${imgData}`);
      processImage(imgData);
    });

    window.electronAPI.onScreenshotError((message) => {
      setError(`Erro na captura: ${message}`);
      setTimeout(() => setError(''), 3000);
    });

    document.addEventListener('keydown', handleKeyPress);
    toggleAntiDetectionMode(true);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const key = await window.electronAPI.getApiKey();
      if (key) setApiKey(key);

      const hash = await window.electronAPI.getCloudflareHash();
      if (hash) setCloudflareHash(hash);

      const savedShortcuts = await window.electronAPI.getShortcuts();
      setShortcuts(savedShortcuts || {});

    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key.toUpperCase() === (shortcuts.opacity30 || 'Alt+1').slice(-1) && e.altKey) {
        setOpacity(0.3);
    } else if (e.key.toUpperCase() === (shortcuts.opacity60 || 'Alt+2').slice(-1) && e.altKey) {
        setOpacity(0.6);
    } else if (e.key.toUpperCase() === (shortcuts.opacity100 || 'Alt+3').slice(-1) && e.altKey) {
        setOpacity(1);
    }
  };


  const processImage = async (imgData) => {
    setIsProcessing(true);
    setSolution('');

    try {
      const extractedText = await OCRService.extractText(imgData);
      setText(extractedText);

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
    await window.electronAPI.saveCloudflareHash(cloudflareHash);
    setShowSettings(false);
  };

  const captureManually = () => {
    window.electronAPI.captureScreen();
  };

  const toggleAntiDetectionMode = (forceActivate = null) => {
    const newMode = forceActivate !== null ? forceActivate : !antiDetectionMode;
    setAntiDetectionMode(newMode);
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
             <small>Sua chave API é armazenada localmente.</small>
          </div>

          <div className="input-group">
            <label htmlFor="cf-hash">Cloudflare Account Hash</label>
            <input
              id="cf-hash"
              type="text"
              placeholder="Seu-account-hash (Opcional)"
              value={cloudflareHash}
              onChange={(e) => setCloudflareHash(e.target.value)}
            />
             <small>Seu hash de conta Cloudflare.</small>
          </div>

          <div className="input-group">
            <label>Modo Anti-Detecção</label>
            <div className="toggle-switch-container">
              <button
                className={`toggle-switch ${antiDetectionMode ? 'active' : 'inactive'}`}
                onClick={() => toggleAntiDetectionMode()}
                aria-pressed={antiDetectionMode}
              >
                <span className="toggle-handle"></span>
              </button>
              <span>{antiDetectionMode ? 'Ativado' : 'Desativado'}</span>
            </div>
            <small>Camufla o app para evitar detecção.</small>
          </div>


          <div className="shortcut-info">
            <p>Atalhos Configurados</p>
            <div className="shortcut-item">
              <span>Capturar tela:</span>
              <span>{shortcuts.capture || 'Não definido'}</span>
            </div>
            <div className="shortcut-item">
              <span>Mostrar/ocultar app:</span>
              <span>{shortcuts.toggle || 'Não definido'}</span>
            </div>
            <div className="shortcut-item">
              <span>Opacidade 30%:</span>
              <span>{shortcuts.opacity30 || 'Não definido'}</span>
            </div>
            <div className="shortcut-item">
              <span>Opacidade 60%:</span>
              <span>{shortcuts.opacity60 || 'Não definido'}</span>
            </div>
            <div className="shortcut-item">
              <span>Opacidade 100%:</span>
              <span>{shortcuts.opacity100 || 'Não definido'}</span>
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
            <span className="header-title">Stupid Button Club</span>
            <div className="header-buttons">
              <span className={`api-key-status ${apiKey ? 'valid' : 'invalid'}`}>
                 {apiKey ? 'API Key OK' : 'No API Key'}
              </span>
              <button
                className="settings-button"
                onClick={() => setShowSettings(true)}
              >
                Settings
              </button>
            </div>
          </div>

          <div className="main-content">
            <div className="input-area">
              <textarea
                placeholder={`Descreva o problema ou pressione ${shortcuts.capture || 'Alt+S'} para capturar`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <button
              className="generate-btn"
              onClick={captureManually}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processando...' : 'Gerar Análise (ou use o atalho)'}
            </button>

            <div className="solution-area">
              {isProcessing ? (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>Analisando...</span>
                </div>
              ) : (
                 solution && <pre className="solution-content">{solution}</pre>
              )}
              {error && <div className="error-message">{error}</div>}
            </div>

            <div className="keyboard-shortcuts">
              <p>Atalhos:</p>
              <p>[{shortcuts.capture || 'Não def.'}]: Captura | [{shortcuts.toggle || 'Não def.'}]: Mostra/Oculta</p>
              <p>[{shortcuts.opacity30 || 'Não def.'}][{shortcuts.opacity60 || 'Não def.'}][{shortcuts.opacity100 || 'Não def.'}]: Opacidade 30/60/100%</p>
              <p>© Stupid Button Club</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;