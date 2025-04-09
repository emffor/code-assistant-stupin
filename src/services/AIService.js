import { createClient } from '@supabase/supabase-js';

class AIService {
  static async uploadToSupabase(imgBase64Data) {
    try {
      // Obter configurações de ambiente
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_KEY;
      const supabaseBucket = process.env.SUPABASE_BUCKET || 'screenshots';
      
      // Criar cliente Supabase
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Converter base64 para blob
      const blob = await fetch(`data:image/png;base64,${imgBase64Data}`).then(res => res.blob());
      const fileName = `screenshot_${Date.now()}.png`;
      
      // Upload para storage do Supabase
      const { data, error } = await supabase.storage
        .from(supabaseBucket)
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      
      // Obter URL pública
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
    try {
      // Chamada direta para API Gemini
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { 
                text: "Analise a imagem neste URL (que contém código ou uma descrição de problema) e explique a solução ou corrija o código. Seja conciso e direto." 
              },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: await this.getImageAsBase64(imageUrl)
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else if (data.promptFeedback?.blockReason) {
        return `Conteúdo bloqueado: ${data.promptFeedback.blockReason}`;
      } else {
        console.error("Resposta inesperada da API:", data);
        throw new Error('Resposta inesperada da API Gemini.');
      }
    } catch (error) {
      console.error('Erro ao chamar Gemini:', error);
      throw new Error(`Falha na análise: ${error.message}`);
    }
  }

  // Função auxiliar para obter imagem como base64
  static async getImageAsBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      return this.arrayBufferToBase64(arrayBuffer);
    } catch (error) {
      console.error('Erro ao converter imagem para base64:', error);
      throw error;
    }
  }

  // Converte ArrayBuffer para Base64
  static arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static async generateSolutionFromText(codeText, apiKey) {
    try {
      const mode = this.detectCodeType(codeText);
      const prompt = this.generatePrompt(codeText, mode);

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Resposta inesperada da API Gemini.');
      }
    } catch (error) {
      console.error('Erro API (texto):', error);
      throw new Error(`Falha na análise de texto: ${error.message}`);
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