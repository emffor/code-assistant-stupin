import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || 'screenshots';
const supabase = createClient(supabaseUrl, supabaseKey);

class AIService {
  static async uploadToSupabase(imgBase64Data) {
    try {
      const blob = await fetch(`data:image/png;base64,${imgBase64Data}`).then(res => res.blob());
      const fileName = `screenshot_${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      
      const { data: urlData } = supabase.storage
        .from(supabaseBucket)
        .getPublicUrl(fileName);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro no upload para Supabase:', error);
      throw error;
    }
  }

  static async generateSolutionFromUrl(imageUrl, apiKey) {
    const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/process-image`;

    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          prompt: "Analise a imagem neste URL (que contém código ou uma descrição de problema) e explique a solução ou corrija o código. Seja conciso e direto.",
          imageUrl: imageUrl,
          model: 'gemini-pro-vision'
        })
      });

      if (!response.ok) {
        let errorMsg = `API Proxy Error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = `API Proxy Error: ${errorData.error || response.statusText}`;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (data && typeof data.solution === 'string') {
          return data.solution;
      } else if (data && data.error) {
          throw new Error(`Gemini Error (via Proxy): ${data.error}`);
      } else {
          console.error("Resposta inesperada do proxy:", data);
          throw new Error('Resposta inesperada do servidor proxy.');
      }
    } catch (error) {
       console.error('Erro ao chamar AIService.generateSolutionFromUrl:', error);
       throw new Error(`Não foi possível gerar a solução: ${error.message}`);
    }
  }

  static async generateSolutionFromText(codeText, apiKey) {
     const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/process-text`;
     try {
       const mode = this.detectCodeType(codeText);
       const prompt = this.generatePrompt(codeText, mode);

       const response = await fetch(EDGE_FUNCTION_URL, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${supabaseKey}`,
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