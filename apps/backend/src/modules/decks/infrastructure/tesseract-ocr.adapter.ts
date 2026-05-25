import { Injectable } from "@nestjs/common";
import { loadImage } from "canvas";
import { createWorker, PSM } from "tesseract.js";
import { OcrPort } from "../ports/ocr.port";

interface RelativeOcrRegion {
  header: "Main Deck" | "Extra Deck" | "Side Deck";
  label: string;
  rectangle: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

interface PixelRectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

@Injectable()
export class TesseractOcrAdapter implements OcrPort {
  private readonly kdeDeckListRegions: RelativeOcrRegion[] = [
    {
      header: "Main Deck",
      label: "Monster Cards",
      rectangle: {
        left: 0.11,
        top: 0.13,
        width: 0.29,
        height: 0.55
      }
    },
    {
      header: "Main Deck",
      label: "Spell Cards",
      rectangle: {
        left: 0.4,
        top: 0.13,
        width: 0.29,
        height: 0.55
      }
    },
    {
      header: "Main Deck",
      label: "Trap Cards",
      rectangle: {
        left: 0.69,
        top: 0.13,
        width: 0.29,
        height: 0.55
      }
    },
    {
      header: "Extra Deck",
      label: "Extra Deck",
      rectangle: {
        left: 0.11,
        top: 0.7,
        width: 0.29,
        height: 0.28
      }
    },
    {
      header: "Side Deck",
      label: "Side Deck",
      rectangle: {
        left: 0.4,
        top: 0.7,
        width: 0.29,
        height: 0.28
      }
    }
  ];

  async extractTextFromImage(imagePath: string): Promise<string> {
    const image = await loadImage(imagePath);
    const worker = await createWorker("eng+spa");

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "300"
      });

      const regionTexts: string[] = [];

      for (const region of this.kdeDeckListRegions) {
        const result = await worker.recognize(imagePath, {
          rectangle: this.toPixelRectangle(region.rectangle, image.width, image.height)
        });
        const text = this.cleanRegionText(result.data.text ?? "");

        regionTexts.push([region.header, region.label, text].filter(Boolean).join("\n"));
      }

      return regionTexts.join("\n");
    } finally {
      await worker.terminate();
    }
  }

  private toPixelRectangle(
    rectangle: RelativeOcrRegion["rectangle"],
    imageWidth: number,
    imageHeight: number
  ): PixelRectangle {
    return {
      left: Math.round(rectangle.left * imageWidth),
      top: Math.round(rectangle.top * imageHeight),
      width: Math.round(rectangle.width * imageWidth),
      height: Math.round(rectangle.height * imageHeight)
    };
  }

  private cleanRegionText(text: string): string {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim())
      .filter(Boolean)
      .join("\n");
  }
}
