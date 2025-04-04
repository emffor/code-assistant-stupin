class AIService {
  static async generateSolutionFromBase64(imgBase64, apiKey) {
    const PROXY_URL = 'https://SEU-WORKER.SEU_NOME.workers.dev';
    
    try {
      const prompt = "Analise esta imagem com código e explique a solução. Seja conciso.";
      
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          prompt: prompt,
          imageBase64: imgBase64,
          model: 'gemini-pro-vision'
        })
      });
      
      if (!response.ok) {
         let errorMsg = `API Proxy Error: ${response.statusText}`;
         try {
             const errorData = await response.json();
             errorMsg = `API Proxy Error: ${errorData.error || response.statusText}`;
         } catch(e) { /* Ignore parsing error */ }
         throw new Error(errorMsg);
      }
      
      const data = await response.json();
      if (data && typeof data.solution === 'string') {
          return data.solution;
      } else if (data && data.error) {
          throw new Error(`Gemini Error: ${data.error}`);
      } else {
          console.error("Resposta inesperada do proxy:", data);
          throw new Error('Resposta inesperada do servidor proxy.');
      }
    } catch (error) {
       console.error('Erro ao gerar solução:', error);
       throw new Error(`Não foi possível gerar a solução: ${error.message}`);
    }
  }

  // Mantidas para compatibilidade
  static async generateSolutionFromText(codeText, apiKey) {
     const PROXY_URL = 'https://SEU-WORKER.SEU_NOME.workers.dev';
     try {
       const mode = this.detectCodeType(codeText);
       const prompt = this.generatePrompt(codeText, mode);
       const response = await fetch(PROXY_URL, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'X-API-Key': apiKey
         },
         body: JSON.stringify({
           text: prompt,
           model: 'gemini-pro'
         })
       });
       if (!response.ok) {
         throw new Error('Falha na API (texto)');
       }
       const data = await response.json();
       return data.solution;
     } catch (error) {
       console.error('Erro API (texto):', error);
       throw new Error(`Não foi possível gerar uma solução a partir do texto: ${error.message}`);
     }
  }
  
  static detectCodeType(text) {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('javascript') || lowerText.includes('js') ||
          text.includes('function') || text.includes('const ') ||
          text.includes('let ') || text.includes('var ')) {
        return 'javascript';
      }
      else if (lowerText.includes('python') || text.includes('def ') ||
              text.includes('import ') || text.includes('class ') ||
              text.includes(':') || text.includes('self.')) {
        return 'python';
      }
      else if (lowerText.includes('error') || lowerText.includes('exception') ||
          lowerText.includes('failed') || lowerText.includes('bug')) {
        return 'debug';
      }
      return 'general';
    }

    static generatePrompt(codeText, mode) {
      const prompts = {
        'javascript': `Analise este código JavaScript e explique a solução. Seja conciso e direto:\n\n${codeText}`,
        'python': `Analise este código Python e explique a solução. Seja conciso e direto:\n\n${codeText}`,
        'debug': `Identifique e corrija os erros neste código. Forneça a solução concisa:\n\n${codeText}`,
        'general': `Analise este código e explique a solução. Seja conciso e direto:\n\n${codeText}`
      };
      return prompts[mode] || prompts.general;
    }
}

export default AIService;