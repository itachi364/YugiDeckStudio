import { loadImage } from "canvas";
import { createWorker } from "tesseract.js";
import { TesseractOcrAdapter } from "../src/modules/decks/infrastructure/tesseract-ocr.adapter";

jest.mock("canvas", () => ({
  loadImage: jest.fn()
}));

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(),
  PSM: {
    SINGLE_BLOCK: "6"
  }
}));

const mockedCreateWorker = jest.mocked(createWorker);
const mockedLoadImage = jest.mocked(loadImage);

describe("TesseractOcrAdapter", () => {
  const recognize = jest.fn();
  const setParameters = jest.fn();
  const terminate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadImage.mockResolvedValue({
      width: 887,
      height: 1248
    } as never);
    mockedCreateWorker.mockResolvedValue({
      recognize,
      setParameters,
      terminate
    } as never);
  });

  it("returns OCR text from tesseract.js grouped by KDE deck list regions", async () => {
    recognize
      .mockResolvedValueOnce({
        data: {
          text: "3 Silvy del Bosque Blanco"
        }
      })
      .mockResolvedValueOnce({
        data: {
          text: "1 Cuentos del Bosque Blanco"
        }
      })
      .mockResolvedValueOnce({
        data: {
          text: "1 Infinito Temporal"
        }
      })
      .mockResolvedValueOnce({
        data: {
          text: "1 Diabell, Reina del Bosque Blanco"
        }
      })
      .mockResolvedValueOnce({
        data: {
          text: "2 Purulia Multivadora"
        }
      });

    const adapter = new TesseractOcrAdapter();

    await expect(adapter.extractTextFromImage("/data/images/deck.png")).resolves.toContain("Main Deck");
    expect(mockedCreateWorker).toHaveBeenCalledWith("eng+spa");
    expect(setParameters).toHaveBeenCalledWith({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      user_defined_dpi: "300"
    });
    expect(recognize).toHaveBeenCalledTimes(5);
    expect(recognize).toHaveBeenNthCalledWith(1, "/data/images/deck.png", {
      rectangle: {
        left: 98,
        top: 162,
        width: 257,
        height: 686
      }
    });
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
