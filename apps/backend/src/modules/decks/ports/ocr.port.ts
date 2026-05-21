export const OCR_PORT = Symbol("OCR_PORT");

export interface OcrPort {
  extractTextFromImage(imagePath: string): Promise<string>;
}
