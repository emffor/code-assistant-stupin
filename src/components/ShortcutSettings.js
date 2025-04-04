import React, { useState, useEffect } from 'react';

function ShortcutSettings({ onClose, shortcuts, setShortcuts }) {
  const [localShortcuts, setLocalShortcuts] = useState({
    capture: '',
    toggle: '',
    opacity30: '',
    opacity60: '',
    opacity100: '',
    batchCapture: '',  // Novo
    batchSend: ''      // Novo
  });
  
  const [currentlyRecording, setCurrentlyRecording] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Inicializa com os atalhos atuais
    setLocalShortcuts(shortcuts);

    // Listener para teclas quando estiver gravando
    const handleKeyDown = (e) => {
      if (currentlyRecording) {
        e.preventDefault();
        
        // Gera a string do atalho (Alt+S, Ctrl+X, etc.)
        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        
        // Adiciona a tecla principal, exceto se for uma tecla modificadora
        if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
          keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
        }
        
        // Precisa ter pelo menos uma tecla modificadora
        if (keys.length < 2) {
          setError('Atalho deve incluir pelo menos uma tecla modificadora (Ctrl, Alt, Shift)');
          return;
        }
        
        setError('');
        const shortcutStr = keys.join('+');
        
        setLocalShortcuts(prev => ({
          ...prev,
          [currentlyRecording]: shortcutStr
        }));
        
        setCurrentlyRecording(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentlyRecording, shortcuts]);

  const startRecording = (key) => {
    setCurrentlyRecording(key);
    setError('');
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI.saveShortcuts(localShortcuts);
      setShortcuts(localShortcuts);
      onClose();
    } catch (err) {
      setError('Falha ao salvar atalhos');
    }
  };

  const getKeyboardIcon = (shortcutKey) => {
    return currentlyRecording === shortcutKey ? '⌨️' : '';
  };

  return (
    <div className="shortcut-settings">
      <h3>Configurar Atalhos</h3>
      
      {error && <div className="shortcut-error">{error}</div>}
      
      <div className="shortcut-list">
        <div className="shortcut-item-config">
          <span>Capturar tela:</span>
          <button 
            onClick={() => startRecording('capture')}
            className={currentlyRecording === 'capture' ? 'recording' : ''}
          >
            {getKeyboardIcon('capture')} {currentlyRecording === 'capture' ? 'Pressione teclas...' : localShortcuts.capture || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item-config">
          <span>Mostrar/ocultar app:</span>
          <button 
            onClick={() => startRecording('toggle')}
            className={currentlyRecording === 'toggle' ? 'recording' : ''}
          >
            {getKeyboardIcon('toggle')} {currentlyRecording === 'toggle' ? 'Pressione teclas...' : localShortcuts.toggle || 'Definir'}
          </button>
        </div>
        
        {/* Novos atalhos para captura em lote */}
        <div className="shortcut-item-config">
          <span>Capturar para lote:</span>
          <button 
            onClick={() => startRecording('batchCapture')}
            className={currentlyRecording === 'batchCapture' ? 'recording' : ''}
          >
            {getKeyboardIcon('batchCapture')} {currentlyRecording === 'batchCapture' ? 'Pressione teclas...' : localShortcuts.batchCapture || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item-config">
          <span>Enviar lote:</span>
          <button 
            onClick={() => startRecording('batchSend')}
            className={currentlyRecording === 'batchSend' ? 'recording' : ''}
          >
            {getKeyboardIcon('batchSend')} {currentlyRecording === 'batchSend' ? 'Pressione teclas...' : localShortcuts.batchSend || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item-config">
          <span>Opacidade 30%:</span>
          <button 
            onClick={() => startRecording('opacity30')}
            className={currentlyRecording === 'opacity30' ? 'recording' : ''}
          >
            {getKeyboardIcon('opacity30')} {currentlyRecording === 'opacity30' ? 'Pressione teclas...' : localShortcuts.opacity30 || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item-config">
          <span>Opacidade 60%:</span>
          <button 
            onClick={() => startRecording('opacity60')}
            className={currentlyRecording === 'opacity60' ? 'recording' : ''}
          >
            {getKeyboardIcon('opacity60')} {currentlyRecording === 'opacity60' ? 'Pressione teclas...' : localShortcuts.opacity60 || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item-config">
          <span>Opacidade 100%:</span>
          <button 
            onClick={() => startRecording('opacity100')}
            className={currentlyRecording === 'opacity100' ? 'recording' : ''}
          >
            {getKeyboardIcon('opacity100')} {currentlyRecording === 'opacity100' ? 'Pressione teclas...' : localShortcuts.opacity100 || 'Definir'}
          </button>
        </div>
      </div>
      
      <div className="button-group">
        <button className="btn-primary" onClick={saveSettings}>Salvar</button>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

export default ShortcutSettings;