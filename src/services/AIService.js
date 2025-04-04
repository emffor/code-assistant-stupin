class AIService {
    static async generateSolution(codeText, apiKey) {
      // Uso de Cloudflare Worker como proxy
      const PROXY_URL = 'https://seu-worker.seu-nome.workers.dev';
      
      try {
        const response = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey // Enviado no header mas interceptado pelo worker
          },
          body: JSON.stringify({
            text: codeText,
            model: 'gemini-pro'
          })
        });
        
        if (!response.ok) {
          throw new Error('Falha na API');
        }
        
        const data = await response.json();
        return data.solution;
      } catch (error) {
        console.error('Erro API:', error);
        return 'Não foi possível gerar uma solução.';
      }
    }
  }
  
  export default AIService;