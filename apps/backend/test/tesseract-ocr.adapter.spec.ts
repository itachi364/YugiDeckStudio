import { recognize } from "tesseract.js";
import { TesseractOcrAdapter } from "../src/modules/decks/infrastructure/tesseract-ocr.adapter";

jest.mock("tesseract.js", () => ({
  recognize: jest.fn()
}));

const mockedRecognize = jest.mocked(recognize);

describe("TesseractOcrAdapter", () => {
  it("returns OCR text from tesseract.js", async () => {
    mockedRecognize.mockResolvedValue({
      data: {
        text: "3 Silvy del Bosque Blanco"
      }
    } as never);

    const adapter = new TesseractOcrAdapter();

    await expect(adapter.extractTextFromImage("/data/images/deck.png")).resolves.toBe("3 Silvy del Bosque Blanco");
    expect(mockedRecognize).toHaveBeenCalledWith("/data/images/deck.png", "eng+spa");
  });
});
