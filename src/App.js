import React, { useState, useEffect } from 'react';
import './App.css';
// Removed OCRService import as it's no longer directly used here
import AIService from './services/AIService';
import ShortcutSettings from './components/ShortcutSettings';
import AntiDetection from './utils/anti-detection'; // Keep if needed

function App() {
  const [screenshot, setScreenshot] = useState(null);
  const [text, setText] = useState(''); // Can be used for status messages now
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState(''); // Gemini API Key
  const [cloudflareAccountId, setCloudflareAccountId] = useState(''); // Cloudflare Account ID
  const [cloudflareApiToken, setCloudflareApiToken] = useState(''); // Cloudflare API Token
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState('');
  const [antiDetectionMode, setAntiDetectionMode] = useState(true);
  const [shortcuts, setShortcuts] = useState({});

  useEffect(() => {
    loadSettings();

    window.electronAPI.onScreenshotCaptured((imgData) => {
      // Optionally display the captured screenshot briefly
      setScreenshot(`data:image/png;base64,${imgData}`);
      // Process the image (upload and send URL to AI)
      processImage(imgData);
    });

    window.electronAPI.onScreenshotError((message) => {
      setError(`Erro na captura: ${message}`);
      setTimeout(() => setError(''), 5000); // Show error longer
    });

    // No keydown listener needed here for opacity anymore, handled in main.js

    toggleAntiDetectionMode(true); // Keep if using anti-detection features

  }, []); // Empty dependency array ensures this runs only once on mount

  const loadSettings = async () => {
    try {
      const key = await window.electronAPI.getApiKey();
      if (key) setApiKey(key);

      const cfAccountId = await window.electronAPI.getCloudflareAccountId();
      if (cfAccountId) setCloudflareAccountId(cfAccountId);

      const cfApiToken = await window.electronAPI.getCloudflareApiToken();
      if (cfApiToken) setCloudflareApiToken(cfApiToken);

      const savedShortcuts = await window.electronAPI.getShortcuts();
      setShortcuts(savedShortcuts || {});

    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Falha ao carregar configurações.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // processImage is now the core function for the new workflow
  const processImage = async (imgBase64Data) => {
    setIsProcessing(true);
    setSolution('');
    setError('');
    setText(''); // Clear previous status/text

    try {
      // Check credentials
      if (!cloudflareAccountId) {
         setError('Configure o Cloudflare Account ID nas configurações.');
         setIsProcessing(false);
         return;
      }
      if (!cloudflareApiToken) {
         setError('Configure o Cloudflare API Token nas configurações.');
         setIsProcessing(false);
         return;
      }
      if (!apiKey) {
         setError('Configure uma API key Gemini válida nas configurações.');
         setIsProcessing(false);
         return;
      }

      setText('Fazendo upload da imagem...'); // Update status

      // 1. Upload screenshot to Cloudflare
      const imageUrl = await AIService.uploadToCloudflare(imgBase64Data, cloudflareAccountId, cloudflareApiToken);

      if (!imageUrl) {
         throw new Error('Falha no upload da imagem para o Cloudflare.');
      }

      setText('Analisando imagem com Gemini...'); // Update status

      // 2. Send image URL to Gemini via proxy
      const aiSolution = await AIService.generateSolutionFromUrl(imageUrl, apiKey);
      setSolution(aiSolution);
      setText(''); // Clear status on success

    } catch (err) {
       console.error('Erro no processamento da imagem:', err);
       setError(`Erro: ${err.message || 'Falha ao processar imagem/gerar solução.'}`);
       setSolution(''); // Clear any partial solution
       setText(''); // Clear status on error
    } finally {
      setIsProcessing(false);
    }
  };


  const saveSettings = async () => {
    try {
      await window.electronAPI.saveApiKey(apiKey);
      await window.electronAPI.saveCloudflareAccountId(cloudflareAccountId);
      await window.electronAPI.saveCloudflareApiToken(cloudflareApiToken);
      setShowSettings(false);
      setError(''); // Clear error on save
    } catch (err) {
        console.error('Erro ao salvar configurações:', err);
        setError('Falha ao salvar configurações.');
    }
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
    // Opacity is now controlled by main.js via setOpacity
    <div className="app">
      {showShortcuts ? (
        <ShortcutSettings
          onClose={() => setShowShortcuts(false)}
          shortcuts={shortcuts}
          setShortcuts={setShortcuts} // Pass the setter function
        />
      ) : showSettings ? (
        <div className="settings-modal">
          <h3>Configurações</h3>

          <div className="input-group">
            <label htmlFor="api-key">API Key Gemini</label>
            <input
              id="api-key"
              type="password"
              placeholder="Insira sua API Key Gemini"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
             <small>Sua chave API é armazenada localmente.</small>
          </div>

          <div className="input-group">
            <label htmlFor="cf-account-id">Cloudflare Account ID</label>
            <input
              id="cf-account-id"
              type="text"
              placeholder="Seu Cloudflare Account ID"
              value={cloudflareAccountId}
              onChange={(e) => setCloudflareAccountId(e.target.value)}
            />
             <small>Necessário para upload de imagens.</small>
          </div>

          <div className="input-group">
            <label htmlFor="cf-api-token">Cloudflare API Token</label>
            <input
              id="cf-api-token"
              type="password"
              placeholder="Seu Cloudflare API Token (Images)"
              value={cloudflareApiToken}
              onChange={(e) => setCloudflareApiToken(e.target.value)}
            />
             <small>Token com permissão de escrita no Cloudflare Images.</small>
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
             {Object.entries(shortcuts).map(([key, value]) => (
                <div className="shortcut-item" key={key}>
                    <span>{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                    <span>{value || 'Não definido'}</span>
                </div>
            ))}
            <button
              className="configure-shortcuts-btn"
              onClick={() => setShowShortcuts(true)}
            >
              Configurar Atalhos
            </button>
          </div>

           {error && <div className="error-message" style={{ marginTop: '10px' }}>{error}</div>}


          <div className="button-group">
            <button className="btn-primary" onClick={saveSettings}>Salvar</button>
            <button className="btn-secondary" onClick={() => {setShowSettings(false); setError('');}}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="main-interface">
          <div className="header">
            <span className="header-title">Stupid Button Club</span>
            <div className="header-buttons">
              <span className={`api-key-status ${apiKey ? 'valid' : 'invalid'}`}>
                 {apiKey ? 'Gemini Key OK' : 'No Gemini Key'}
              </span>
              <span className={`api-key-status ${(cloudflareAccountId && cloudflareApiToken) ? 'valid' : 'invalid'}`} style={{ marginLeft: '10px' }}>
                 {(cloudflareAccountId && cloudflareApiToken) ? 'CF Keys OK' : 'No CF Keys'}
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
            {/* Removed the input textarea as primary input is now screenshot */}
             {/* Optionally display the captured screenshot preview */}
             {screenshot && (
                <div className="preview">
                <p style={{ textAlign: 'center', margin: '5px 0', fontSize: '12px', color: '#aaa' }}>
                    Última Captura:
                </p>
                <img src={screenshot} alt="Captura" />
                </div>
            )}

            <button
              className="generate-btn"
              onClick={captureManually}
              disabled={isProcessing}
            >
              {isProcessing ? text || 'Processando...' : `Analisar Screenshot (${shortcuts.capture || 'Alt+S'})`}
            </button>

            <div className="solution-area">
              {isProcessing && !solution && (
                <div className="loading">
                  <div className="spinner"></div>
                  <span>{text || 'Processando...'}</span>
                </div>
              )}
              {solution && !isProcessing && <pre className="solution-content">{solution}</pre>}
              {error && <div className="error-message">{error}</div>}
              {!isProcessing && !solution && !error && !text && (
                <div className="placeholder-text">
                  Pressione o botão ou use o atalho ({shortcuts.capture || 'Alt+S'}) para capturar e analisar a tela.
                </div>
               )}
            </div>

            <div className="keyboard-shortcuts">
              <p>Atalhos:</p>
              <p>[{shortcuts.capture || 'Não def.'}]: Captura | [{shortcuts.toggle || 'Não def.'}]: Mostra/Oculta</p>
              <p>[Alt+1][Alt+2][Alt+3]: Opacidade 30/60/100%</p>
              <p>© Stupid Button Club</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;