import React, { useState } from 'react';

function BatchProcessingModal({ onClose, batchData, onProcessAll }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [results, setResults] = useState([]);
  
  const startProcessing = async () => {
    setIsProcessing(true);
    setProcessingIndex(0);
    setResults([]);
    
    try {
      const allResults = await onProcessAll(
        batchData, 
        (index, result) => {
          setProcessingIndex(index);
          setResults(prev => [...prev, { index, result }]);
        }
      );
      
      // Ao finalizar, atualiza estado
      setProcessingIndex(-1);
    } catch (error) {
      console.error('Erro no processamento em lote:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="batch-processing-modal">
      <h3>Processamento em Lote</h3>
      
      <div className="batch-summary">
        <p>Total de capturas: <strong>{batchData.length}</strong></p>
      </div>
      
      <div className="batch-items-list">
        {batchData.map((item, index) => (
          <div 
            key={item.timestamp} 
            className={`batch-item ${processingIndex === index ? 'processing' : ''} ${results.some(r => r.index === index) ? 'processed' : ''}`}
          >
            <span className="batch-item-number">#{index + 1}</span>
            <span className="batch-item-time">{formatTimestamp(item.timestamp)}</span>
            {processingIndex === index && <div className="mini-spinner"></div>}
            {results.some(r => r.index === index) && <span className="batch-success">✓</span>}
          </div>
        ))}
      </div>
      
      {results.length > 0 && (
        <div className="batch-results">
          <h4>Resultados ({results.length}/{batchData.length})</h4>
          <div className="results-container">
            {results.map((result, i) => (
              <div key={i} className="result-item">
                <div className="result-header">
                  <span className="result-number">#{result.index + 1}</span>
                  <span className="result-time">{formatTimestamp(batchData[result.index].timestamp)}</span>
                </div>
                <pre className="result-content">{result.result}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="button-group">
        <button 
          className="btn-primary" 
          onClick={startProcessing} 
          disabled={isProcessing || batchData.length === 0}
        >
          {isProcessing ? `Processando ${processingIndex + 1}/${batchData.length}...` : 'Processar Tudo'}
        </button>
        <button 
          className="btn-secondary" 
          onClick={onClose}
          disabled={isProcessing}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export default BatchProcessingModal;