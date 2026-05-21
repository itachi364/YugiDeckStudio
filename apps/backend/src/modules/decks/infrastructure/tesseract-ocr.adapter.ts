import { Injectable } from "@nestjs/common";
import { recognize } from "tesseract.js";
import { OcrPort } from "../ports/ocr.port";

@Injectable()
export class TesseractOcrAdapter implements OcrPort {
  async extractTextFromImage(imagePath: string): Promise<string> {
    const result = await recognize(imagePath, "eng+spa");
    return result.data.text ?? "";
  }
}
