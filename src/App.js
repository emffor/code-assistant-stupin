import React, { useState, useEffect } from 'react';
import './App.css';
import AIService from './services/AIService';
import ShortcutSettings from './components/ShortcutSettings';
import BatchProcessingModal from './components/BatchProcessingModal';
import AntiDetection from './utils/anti-detection';

function App() {
  const [screenshot, setScreenshot] = useState(null);
  const [text, setText] = useState('');
  const [solution, setSolution] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState('');
  const [antiDetectionMode, setAntiDetectionMode] = useState(true);
  const [shortcuts, setShortcuts] = useState({});
  
  const [batchCount, setBatchCount] = useState(0);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchData, setBatchData] = useState([]);
  const [lastBatchTimestamp, setLastBatchTimestamp] = useState(null);

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
    
    window.electronAPI.onBatchScreenshotAdded(({ count, timestamp }) => {
      setBatchCount(count);
      setLastBatchTimestamp(timestamp);
      const notification = document.createElement('div');
      notification.className = 'batch-notification';
      notification.textContent = `Captura #${count} adicionada ao lote`;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(notification), 500);
      }, 1500);
    });
    
    window.electronAPI.onBatchScreenshots((data) => {
      setBatchData(data);
      setShowBatchModal(true);
    });
    
    window.electronAPI.onBatchEmpty(() => {
      setError('Nenhuma captura no lote para processar');
      setTimeout(() => setError(''), 3000);
    });
    
    document.addEventListener('keydown', handleKeyPress);
    
    toggleAntiDetectionMode(true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [shortcuts]);

  useEffect(() => {
    const loadBatchCount = async () => {
      try {
        const count = await window.electronAPI.getBatchCount();
        setBatchCount(count);
      } catch (err) {
        console.error('Erro ao carregar contagem do lote:', err);
      }
    };
    
    loadBatchCount();
  }, []);

  const handleKeyPress = (e) => {
    if (e.altKey) {
      const key = e.key;
      if (key === (shortcuts.opacity30 || 'Alt+1').slice(-1)) {
        setOpacity(0.3);
      } else if (key === (shortcuts.opacity60 || 'Alt+2').slice(-1)) {
        setOpacity(0.6);
      } else if (key === (shortcuts.opacity100 || 'Alt+3').slice(-1)) {
        setOpacity(1);
      }
    }
  };

  const loadSettings = async () => {
     try {
      const key = await window.electronAPI.getApiKey();
      if (key) setApiKey(key);
      
      const sbUrl = await window.electronAPI.getSupabaseUrl();
      if (sbUrl) setSupabaseUrl(sbUrl);
      
      const sbKey = await window.electronAPI.getSupabaseKey();
      if (sbKey) setSupabaseKey(sbKey);
      
      const savedShortcuts = await window.electronAPI.getShortcuts();
      setShortcuts(savedShortcuts || {});
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
      setError('Falha ao carregar configurações.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const cropAndProcessImage = async (fullImgBase64, bounds) => {
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
  };

  const processCroppedImage = async (croppedImgBase64) => {
      setText('Fazendo upload da imagem...');
      setError('');
      setSolution('');
      try {
        if (!supabaseUrl || !supabaseKey || !apiKey) {
           setError('Credenciais ausentes. Verifique as configurações.');
           setIsProcessing(false);
           return;
        }
        
        // Definir env vars dinamicamente para o service
        process.env.SUPABASE_URL = supabaseUrl;
        process.env.SUPABASE_KEY = supabaseKey;
        
        const imageUrl = await AIService.uploadToSupabase(croppedImgBase64);
        if (!imageUrl) {
           throw new Error('Falha no upload da imagem para o Supabase.');
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
  
  const processBatchScreenshots = async (batchItems, progressCallback) => {
    const results = [];
    
    for (let i = 0; i < batchItems.length; i++) {
      try {
        const item = batchItems[i];
        const image = await createImageFromBase64(item.imgBase64);
        const croppedBase64 = cropImageWithCanvas(image, item.bounds);
        
        process.env.SUPABASE_URL = supabaseUrl;
        process.env.SUPABASE_KEY = supabaseKey;
        
        const imageUrl = await AIService.uploadToSupabase(croppedBase64);
        const aiResult = await AIService.generateSolutionFromUrl(imageUrl, apiKey);
        
        results.push(aiResult);
        
        if (progressCallback) {
          progressCallback(i, aiResult);
        }
        
      } catch (error) {
        console.error(`Erro ao processar item ${i} do lote:`, error);
        results.push(`Erro: ${error.message}`);
        
        if (progressCallback) {
          progressCallback(i, `Erro: ${error.message}`);
        }
      }
    }
    
    return results;
  };
  
  const createImageFromBase64 = (base64) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `data:image/png;base64,${base64}`;
    });
  };
  
  const cropImageWithCanvas = (image, bounds) => {
    const canvas = document.createElement('canvas');
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const ctx = canvas.getContext('2d');
    
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
    
    return canvas.toDataURL('image/png').split(',')[1];
  };

  const saveSettings = async () => {
     try {
      await window.electronAPI.saveApiKey(apiKey);
      await window.electronAPI.saveSupabaseUrl(supabaseUrl);
      await window.electronAPI.saveSupabaseKey(supabaseKey);
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
  
  const clearBatch = async () => {
    try {
      await window.electronAPI.clearBatch();
      setBatchCount(0);
      setLastBatchTimestamp(null);
    } catch (err) {
      console.error('Erro ao limpar lote:', err);
      setError('Falha ao limpar lote de capturas.');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="app" style={{ opacity }}>
      {showBatchModal && (
        <BatchProcessingModal
          onClose={() => {
            setShowBatchModal(false);
            setBatchData([]);
          }}
          batchData={batchData}
          onProcessAll={processBatchScreenshots}
        />
      )}
      
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
            <label htmlFor="supabase-url">Supabase URL</label>
            <input
              id="supabase-url"
              type="text"
              placeholder="Sua URL do Supabase"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
             <small>URL completa do seu projeto Supabase.</small>
          </div>
          <div className="input-group">
            <label htmlFor="supabase-key">Supabase Anon Key</label>
            <input
              id="supabase-key"
              type="password"
              placeholder="Sua chave anon do Supabase"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
             <small>Chave de acesso anônimo ao Supabase.</small>
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
              <span className={`api-key-status ${(supabaseUrl && supabaseKey) ? 'valid' : 'invalid'}`} style={{ marginLeft: '10px' }}>
                 {(supabaseUrl && supabaseKey) ? 'Supabase OK' : 'No Supabase'}
              </span>
              
              {batchCount > 0 && (
                <div className="batch-indicator" onClick={() => setShowBatchModal(true)}>
                  <span className="batch-count">{batchCount}</span>
                  <span className="batch-label">no lote</span>
                </div>
              )}
              
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
            
            <div className="capture-buttons">
              <button
                className="generate-btn"
                onClick={captureManually}
                disabled={isProcessing}
              >
                {isProcessing ? text || 'Processando...' : `Analisar Área (${shortcuts.capture || 'Alt+S'})`}
              </button>
              
              {batchCount > 0 && (
                <div className="batch-actions">
                  <button 
                    className="batch-send-btn" 
                    onClick={() => window.electronAPI.onBatchScreenshots([])}
                    title="Enviar lote para processamento"
                  >
                    Processar Lote ({batchCount})
                  </button>
                  <button 
                    className="batch-clear-btn" 
                    onClick={clearBatch}
                    title="Limpar lote atual"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            
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
              <p>[{shortcuts.capture || 'Não def.'}]: Captura Imediata | [{shortcuts.toggle || 'Não def.'}]: Mostra/Oculta</p>
              <p>[{shortcuts.batchCapture || 'Alt+D'}]: Add ao Lote | [{shortcuts.batchSend || 'Alt+F'}]: Enviar Lote</p>
              <p>[{shortcuts.opacity30 || 'Alt+1'}][{shortcuts.opacity60 || 'Alt+2'}][{shortcuts.opacity100 || 'Alt+3'}]: Opacidade 30/60/100%</p>
              <p>© Stupid Button Club</p>
            </div>
           </div>
         </div>
       )}
     </div>
  );
}

export default App;