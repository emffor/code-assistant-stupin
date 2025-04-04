import React, { useState, useEffect } from 'react';

function ShortcutSettings({ onClose }) {
  const [shortcuts, setShortcuts] = useState({
    capture: '',
    toggle: '',
    opacity30: '',
    opacity60: '',
    opacity100: ''
  });
  
  const [currentlyRecording, setCurrentlyRecording] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Carrega atalhos atuais
    window.electronAPI.getShortcuts().then(savedShortcuts => {
      if (savedShortcuts) {
        setShortcuts(savedShortcuts);
      }
    });

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
        
        setShortcuts(prev => ({
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
  }, [currentlyRecording]);

  const startRecording = (key) => {
    setCurrentlyRecording(key);
    setError('');
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI.saveShortcuts(shortcuts);
      onClose();
    } catch (err) {
      setError('Falha ao salvar atalhos');
    }
  };

  return (
    <div className="shortcut-settings">
      <h3>Configurar Atalhos</h3>
      
      {error && <div className="shortcut-error">{error}</div>}
      
      <div className="shortcut-list">
        <div className="shortcut-item">
          <span>Capturar tela:</span>
          <button 
            onClick={() => startRecording('capture')}
            className={currentlyRecording === 'capture' ? 'recording' : ''}
          >
            {currentlyRecording === 'capture' ? 'Pressione teclas...' : shortcuts.capture || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item">
          <span>Mostrar/ocultar app:</span>
          <button 
            onClick={() => startRecording('toggle')}
            className={currentlyRecording === 'toggle' ? 'recording' : ''}
          >
            {currentlyRecording === 'toggle' ? 'Pressione teclas...' : shortcuts.toggle || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item">
          <span>Opacidade 30%:</span>
          <button 
            onClick={() => startRecording('opacity30')}
            className={currentlyRecording === 'opacity30' ? 'recording' : ''}
          >
            {currentlyRecording === 'opacity30' ? 'Pressione teclas...' : shortcuts.opacity30 || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item">
          <span>Opacidade 60%:</span>
          <button 
            onClick={() => startRecording('opacity60')}
            className={currentlyRecording === 'opacity60' ? 'recording' : ''}
          >
            {currentlyRecording === 'opacity60' ? 'Pressione teclas...' : shortcuts.opacity60 || 'Definir'}
          </button>
        </div>
        
        <div className="shortcut-item">
          <span>Opacidade 100%:</span>
          <button 
            onClick={() => startRecording('opacity100')}
            className={currentlyRecording === 'opacity100' ? 'recording' : ''}
          >
            {currentlyRecording === 'opacity100' ? 'Pressione teclas...' : shortcuts.opacity100 || 'Definir'}
          </button>
        </div>
      </div>
      
      <div className="button-group">
        <button onClick={saveSettings}>Salvar</button>
        <button onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

export default ShortcutSettings;