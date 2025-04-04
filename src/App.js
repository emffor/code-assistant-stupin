import React, { useState, useEffect } from 'react';
import './App.css';
import AIService from './services/AIService';
import ShortcutSettings from './components/ShortcutSettings';
import AntiDetection from './utils/anti-detection';

function App() {
  const [screenshot, setScreenshot] = useState(null);
  const [text, setText] = useState('');
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [cloudflareAccountId, setCloudflareAccountId] = useState('');
  const [cloudflareApiToken, setCloudflareApiToken] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [error, setError] = useState('');
  const [antiDetectionMode, setAntiDetectionMode] = useState(true);
  const [shortcuts, setShortcuts] = useState({});

  useEffect(() => {
    loadSettings();
    window.electronAPI.onFullScreenshotInfo(({ imgBase64: fullImgBase64, bounds }) => {
       cropAndProcessImage(fullImgBase64, bounds);
    });
    window.electronAPI.onScreenshotError((message) => {
      setError(`Erro na captura: ${message}`);
       setIsProcessing(false);
      setTimeout(() => setError(''), 5000);
    });
    toggleAntiDetectionMode(true);
  }, []);

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

  const cropAndProcessImage = (fullImgBase64, bounds) => {
      setText('Recortando imagem...');
      setIsProcessing(true);
      setError('');
      setSolution('');
      setScreenshot(null);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        const ctx = canvas.getContext('2d');

        try {
            ctx.drawImage(
              image,
              bounds.x,
              bounds.y,
              bounds.width,
              bounds.height,
              0,
              0,
              bounds.width,
              bounds.height
            );
            const croppedImgBase64 = canvas.toDataURL('image/png').split(',')[1];
            setScreenshot(`data:image/png;base64,${croppedImgBase64}`);
            processCroppedImage(croppedImgBase64);
        } catch(e) {
            console.error("Erro ao recortar imagem no canvas:", e);
            setError(`Erro ao recortar imagem: ${e.message}`);
            setIsProcessing(false);
            setText('');
        }
      };
      image.onerror = (err) => {
          console.error("Erro ao carregar imagem da tela inteira:", err);
          setError("Falha ao carregar imagem capturada para recorte.");
          setIsProcessing(false);
          setText('');
      };
      image.src = `data:image/png;base64,${fullImgBase64}`;
  }

  const processCroppedImage = async (croppedImgBase64) => {
      setText('Fazendo upload da imagem recortada...');
      setError('');
      setSolution('');
      try {
        if (!cloudflareAccountId || !cloudflareApiToken || !apiKey) {
           setError('Credenciais ausentes. Verifique as configurações.');
           setIsProcessing(false);
           return;
        }
        const imageUrl = await AIService.uploadToCloudflare(croppedImgBase64, cloudflareAccountId, cloudflareApiToken);
        if (!imageUrl) {
           throw new Error('Falha no upload da imagem para o Cloudflare.');
        }
        setText('Analisando imagem com Gemini...');
        const aiSolution = await AIService.generateSolutionFromUrl(imageUrl, apiKey);
        setSolution(aiSolution);
        setText('');
      } catch (err) {
         console.error('Erro no processamento da imagem recortada:', err);
         setError(`Erro: ${err.message || 'Falha ao processar/analisar imagem.'}`);
         setSolution('');
         setText('');
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
      setError('');
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
     <div className="app">
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
             {screenshot && !isProcessing && (
                <div className="preview">
                 <p style={{ textAlign: 'center', margin: '5px 0', fontSize: '12px', color: '#aaa' }}>
                     Preview da Área Capturada:
                 </p>
                 <img src={screenshot} alt="Captura Recortada" />
                </div>
             )}
             {isProcessing && text.includes('Recortando') && (
                 <div className="preview" style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
                     {text}
                 </div>
             )}
             <button
               className="generate-btn"
               onClick={captureManually}
               disabled={isProcessing}
             >
               {isProcessing ? text || 'Processando...' : `Analisar Área (${shortcuts.capture || 'Alt+S'})`}
             </button>
             <div className="solution-area">
               {isProcessing && !text.includes('Recortando') && (
                 <div className="loading">
                   <div className="spinner"></div>
                   <span>{text || 'Analisando...'}</span>
                 </div>
               )}
                {solution && !isProcessing && <pre className="solution-content">{solution}</pre>}
               {error && <div className="error-message">{error}</div>}
                {!isProcessing && !solution && !error && !text && (
                 <div className="placeholder-text">
                    Pressione o botão ou use o atalho ({shortcuts.capture || 'Alt+S'}) para capturar e analisar a área sob a janela.
                 </div>
                )}
             </div>
             <div className="keyboard-shortcuts">
              <p>Atalhos:</p>
              <p>[{shortcuts.capture || 'Não def.'}]: Captura Área | [{shortcuts.toggle || 'Não def.'}]: Mostra/Oculta</p>
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