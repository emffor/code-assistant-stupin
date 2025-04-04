import Tesseract from 'tesseract.js';

class OCRService {
  static async extractText(imageData) {
    try {
      // Configurações otimizadas para reconhecimento de código
      const result = await Tesseract.recognize(
        `data:image/png;base64,${imageData}`,
        'eng',
        { 
          logger: m => console.log(m),
          tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:(){}[]<>!@#$%^&*-+=_|\\/"\'`~? ',
          tessedit_pageseg_mode: '6', // Modo para blocos de texto uniforme
          preserve_interword_spaces: '1',
          tessedit_ocr_engine_mode: '2', // LSTM only
          tessjs_create_hocr: '0',
          tessjs_create_tsv: '0'
        }
      );
      
      // Processamento para formato de código
      let extractedText = result.data.text;
      
      // Preserva indentação e formatação de código
      extractedText = this.formatCodeIndentation(extractedText);
      
      // Corrige problemas comuns com caracteres especiais em código
      extractedText = this.fixCommonCodeSymbols(extractedText);
      
      return extractedText;
    } catch (error) {
      console.error('Erro OCR:', error);
      throw error;
    }
  }

  // Ajuda a preservar indentação de código
  static formatCodeIndentation(text) {
    // Divide em linhas
    const lines = text.split('\n');
    
    // Para cada linha, preserva espaços iniciais
    const processedLines = lines.map(line => {
      // Conta espaços iniciais
      const leadingSpaces = line.match(/^\s*/)[0].length;
      
      // Se houver caracteres após os espaços, preserva a indentação
      if (line.trim().length > 0) {
        return ' '.repeat(leadingSpaces) + line.trim();
      }
      return '';
    });
    
    return processedLines.join('\n');
  }

  // Corrige símbolos comuns mal interpretados em código
  static fixCommonCodeSymbols(text) {
    const replacements = [
      { from: /\[\]/g, to: '[]' },      // Corrige arrays
      { from: /\{\}/g, to: '{}' },      // Corrige objetos
      { from: /\(\)/g, to: '()' },      // Corrige parênteses
      { from: /==/g, to: '==' },        // Igualdade
      { from: /===/g, to: '===' },      // Igualdade estrita
      { from: /!=/g, to: '!=' },        // Diferença
      { from: /!==/g, to: '!==' },      // Diferença estrita
      { from: /\|\|/g, to: '||' },      // OR lógico
      { from: /&&/g, to: '&&' },        // AND lógico
      { from: /\/\//g, to: '//' },      // Comentários
      { from: /\/\*/g, to: '/*' },      // Início de comentário multi-linha
      { from: /\*\//g, to: '*/' },      // Fim de comentário multi-linha
      { from: /;/g, to: ';' },          // Ponto e vírgula
      { from: /=>/g, to: '=>' },        // Arrow function
      { from: /\+\+/g, to: '++' },      // Incremento
      { from: /\-\-/g, to: '--' },      // Decremento
      { from: /\.\.\./g, to: '...' },   // Spread operator
      { from: /`/g, to: '`' }           // Template literals
    ];
    
    let result = text;
    for (const {from, to} of replacements) {
      result = result.replace(from, to);
    }
    
    return result;
  }
}

export default OCRService;