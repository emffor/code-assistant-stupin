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
             {/* <small>Sua chave API é armazenada localmente.</small> */}
          </div>

          <div className="input-group">
            <label htmlFor="cf-hash">Cloudflare Account Hash</label>
            <input
              id="cf-hash"
              type="text"
              placeholder="Seu-account-hash"
              value={cloudflareHash}
              onChange={(e) => setCloudflareHash(e.target.value)}
            />
             <small>Seu hash de conta Cloudflare (opcional).</small>
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
            <span className="header-title">Stupid Button Club</span>
            <div className="header-buttons">
              <span className="api-key-status">No API Key</span>
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
                placeholder="Describe the problem or press Alt+S to capture a screenshot"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <button
              className="generate-btn"
              onClick={captureManually}
              disabled={isProcessing}
            >
              Generate Analysis
            </button>

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

            <div className="keyboard-shortcuts">
              <p>Keyboard Shortcuts:</p>
              <p>[Alt + M]: Move window</p>
              <p>[Alt + S]: Capture screen, [Alt + Enter]: Analyze, [Alt + Reset], [Alt]: Toggle</p>
              <p>[Alt + 1,2,3]: Adjust window opacity</p>
              <p>© Stupid Button Club</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;