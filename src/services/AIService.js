class AIService {

  static async uploadToCloudflare(imgBase64Data, accountId, apiToken) {
    try {
      const blob = await fetch(`data:image/png;base64,${imgBase64Data}`).then(res => res.blob());

      const formData = new FormData();
      formData.append('file', blob, 'screenshot.png');

      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
        body: formData
      });

      if (!response.ok) {
        let errorMsg = `Cloudflare upload failed: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = `Cloudflare upload failed: ${errorData.errors[0]?.message || response.statusText}`;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.success && data.result && data.result.variants && data.result.variants.length > 0) {
        // Retorna o URL da primeira variante (geralmente a pública/web-friendly)
        // Certifique-se que seu Cloudflare Images está configurado para permitir acesso público
        return data.result.variants[0];
      } else {
        throw new Error('Cloudflare upload succeeded but no image URL was returned.');
      }
    } catch (error) {
      console.error('Erro no upload para Cloudflare:', error);
      throw error; // Re-lança o erro para ser tratado no App.js
    }
  }


  static async generateSolutionFromUrl(imageUrl, apiKey) {
    const PROXY_URL = 'https://SEU-WORKER.SEU_NOME.workers.dev'; // Substitua!

    try {
      const prompt = "Analise a imagem neste URL (que contém código ou uma descrição de problema) e explique a solução ou corrija o código. Seja conciso e direto.";

      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          prompt: prompt,
          imageUrl: imageUrl,
          model: 'gemini-pro-vision' // Ou 'gemini-1.5-pro' ou outro modelo vision
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
      // Verifica se a resposta contém a solução esperada
      if (data && typeof data.solution === 'string') {
          return data.solution;
      } else if (data && data.error) {
          // Se o worker retornou um erro estruturado
          throw new Error(`Gemini Error (via Proxy): ${data.error}`);
      }
       else {
          // Resposta inesperada do proxy
          console.error("Resposta inesperada do proxy:", data);
          throw new Error('Resposta inesperada do servidor proxy.');
      }

    } catch (error) {
       console.error('Erro ao chamar AIService.generateSolutionFromUrl:', error);
       // Lança um erro mais informativo para a UI
       throw new Error(`Não foi possível gerar a solução: ${error.message}`);
    }
  }

  // Manter a função antiga se precisar de análise de texto em outro lugar,
  // caso contrário, pode remover.
  static async generateSolutionFromText(codeText, apiKey) {
     const PROXY_URL = 'https://SEU-WORKER.SEU_NOME.workers.dev'; // Substitua!
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
           text: prompt, // Payload antigo para texto
           model: 'gemini-pro' // Modelo antigo para texto
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

  // Funções auxiliares detectCodeType e generatePrompt podem ser mantidas ou removidas
  // se generateSolutionFromText for removida.
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
      // ... outras detecções ...
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
        // ... outros prompts ...
        'debug': `Identifique e corrija os erros neste código. Forneça a solução concisa:\n\n${codeText}`,
        'general': `Analise este código e explique a solução. Seja conciso e direto:\n\n${codeText}`
      };
      return prompts[mode] || prompts.general;
    }

}

export default AIService;