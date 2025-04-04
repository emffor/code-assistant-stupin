import Tesseract from 'tesseract.js';

class OCRService {
  static async extractText(imageData) {
    try {
      const result = await Tesseract.recognize(
        `data:image/png;base64,${imageData}`,
        'eng',
        { logger: m => console.log(m) }
      );
      
      return result.data.text;
    } catch (error) {
      console.error('Erro OCR:', error);
      throw error;
    }
  }
}

export default OCRService;