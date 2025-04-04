/**
 * Utilitários para anti-detecção de ferramentas de monitoramento
 */

const AntiDetection = {
    /**
     * Detecta se há ferramentas de monitoramento conhecidas rodando
     * @returns {boolean} true se detectar ferramentas de monitoramento
     */
    detectMonitoring: () => {
      // Verifica extensões de navegador que possam estar monitorando
      const hasDevTools = window.devtools && window.devtools.open;
      
      // Verifica monitoramento de tela via tamanho da janela
      const screenSizeMatch = window.screen.width === window.innerWidth && 
                              window.screen.height === window.innerHeight;
      
      // Verifica presença de gravadores de tela comuns
      const hasRecorders = !!window.MediaRecorder || 
                           !!navigator.mediaDevices || 
                           !!window.RTCPeerConnection;
      
      return hasDevTools || screenSizeMatch || hasRecorders;
    },
  
    /**
     * Camufla o app para parecer uma ferramenta inofensiva
     * @param {boolean} activated Se deve ativar o modo camuflado
     */
    activateCamouflage: (activated) => {
      if (activated) {
        // Altera o título da página para parecer inofensivo
        document.title = "Anotações de Estudo";
        
        // Adiciona elementos falsos para enganar monitoramento
        const fakeElement = document.createElement('div');
        fakeElement.id = 'study-notes-container';
        fakeElement.style.display = 'none';
        fakeElement.innerHTML = `
          <h1>Anotações do Curso</h1>
          <p>Revisão de algoritmos e estruturas de dados</p>
          <ul>
            <li>Arrays e Strings</li>
            <li>Listas Encadeadas</li>
            <li>Árvores e Grafos</li>
            <li>Algoritmos de Ordenação</li>
          </ul>
        `;
        document.body.appendChild(fakeElement);
        
        // Adiciona favicon genérico
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📝</text></svg>';
        document.head.appendChild(favicon);
      } else {
        // Remove elementos falsos
        const fakeElement = document.getElementById('study-notes-container');
        if (fakeElement) {
          document.body.removeChild(fakeElement);
        }
        
        // Restaura título original
        document.title = "Assistente Discreto";
        
        // Remove favicon genérico
        const favicon = document.querySelector("link[rel='icon']");
        if (favicon) {
          document.head.removeChild(favicon);
        }
      }
    },
  
    /**
     * Camufla comunicação com API para parecer tráfego normal
     * @param {string} url URL da API
     * @param {Object} data Dados a enviar
     * @returns {Promise} Promessa com resposta
     */
    camouflageApiCall: async (url, data) => {
      // Gera cabeçalhos aleatórios para camuflar requisição
      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'FetchAPI',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty'
      };
      
      // Adiciona atraso aleatório para evitar padrões de tempo
      const delay = Math.floor(Math.random() * 500 + 200);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Faz requisição com dados originais
      return fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
    },
  
    /**
     * Ativa modo invisível para evitar captura de gravações de tela
     * @param {boolean} activated Se deve ativar o modo invisível
     * @param {HTMLElement} element Elemento a tornar invisível para gravações
     */
    activateInvisibleMode: (activated, element) => {
      if (!element) return;
      
      if (activated) {
        // Técnicas CSS para evitar captura por gravadores de tela
        element.style.background = 'rgba(30, 30, 30, 0.01)';
        element.style.backdropFilter = 'blur(5px)';
        element.style.boxShadow = 'none';
        element.style.borderColor = 'transparent';
        element.style.color = 'rgba(255, 255, 255, 0.01)';
        element.style.textShadow = '0 0 5px rgba(255, 255, 255, 0.8)';
        
        // Adiciona classe para estilização adicional
        element.classList.add('anti-detection-mode');
      } else {
        // Restaura estilos originais
        element.style.background = '';
        element.style.backdropFilter = '';
        element.style.boxShadow = '';
        element.style.borderColor = '';
        element.style.color = '';
        element.style.textShadow = '';
        
        // Remove classe de estilização
        element.classList.remove('anti-detection-mode');
      }
    }
  };
  
  export default AntiDetection;