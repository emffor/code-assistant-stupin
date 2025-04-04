class AIService {
  static async generateSolution(codeText, apiKey) {
    // Uso de Cloudflare Worker como proxy
    const PROXY_URL = 'https://seu-worker.seu-nome.workers.dev';
    
    try {
      // Detecta o modo de análise
      const mode = this.detectCodeType(codeText);
      const prompt = this.generatePrompt(codeText, mode);
      
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey // Enviado no header mas interceptado pelo worker
        },
        body: JSON.stringify({
          text: prompt,
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

  // Detecta o tipo de código/problema para melhor contextualização
  static detectCodeType(text) {
    const lowerText = text.toLowerCase();
    
    // Detecção de linguagem/framework
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
    else if (lowerText.includes('java') || text.includes('public class') || 
            text.includes('public static void main')) {
      return 'java';
    }
    else if (lowerText.includes('c++') || text.includes('cout') || 
            text.includes('cin') || text.includes('#include')) {
      return 'cpp';
    }
    else if (lowerText.includes('sql') || lowerText.includes('select ') || 
            lowerText.includes('from ') || lowerText.includes('where ')) {
      return 'sql';
    }
    
    // Detecção de tipo de problema
    if (lowerText.includes('error') || lowerText.includes('exception') || 
        lowerText.includes('failed') || lowerText.includes('bug')) {
      return 'debug';
    }
    else if (lowerText.includes('optimize') || lowerText.includes('performance') || 
            lowerText.includes('slow') || lowerText.includes('efficiency')) {
      return 'optimization';
    }
    else if (lowerText.includes('implement') || lowerText.includes('create')) {
      return 'implementation';
    }
    
    // Padrão
    return 'general';
  }

  // Gera um prompt adequado ao tipo de problema
  static generatePrompt(codeText, mode) {
    const prompts = {
      'javascript': `Analise este código JavaScript e explique a solução. Seja conciso e direto:\n\n${codeText}`,
      'python': `Analise este código Python e explique a solução. Seja conciso e direto:\n\n${codeText}`,
      'java': `Analise este código Java e explique a solução. Seja conciso e direto:\n\n${codeText}`,
      'cpp': `Analise este código C++ e explique a solução. Seja conciso e direto:\n\n${codeText}`,
      'sql': `Analise esta query SQL e explique a solução. Seja conciso e direto:\n\n${codeText}`,
      'debug': `Identifique e corrija os erros neste código. Forneça a solução concisa:\n\n${codeText}`,
      'optimization': `Otimize este código para melhor performance. Forneça a versão otimizada:\n\n${codeText}`,
      'implementation': `Implemente a solução para este problema. Forneça código conciso:\n\n${codeText}`,
      'general': `Analise este código e explique a solução. Seja conciso e direto:\n\n${codeText}`
    };
    
    return prompts[mode] || prompts.general;
  }
}

export default AIService;