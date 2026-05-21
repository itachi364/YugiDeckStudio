import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { ConfirmDeckReviewUseCase } from "./application/confirm-deck-review.use-case";
import { DeckReviewPolicyService } from "./application/deck-review-policy.service";
import { ExtractDeckListFromImageUseCase } from "./application/extract-deck-list.use-case";
import { UpdateDeckCardsUseCase } from "./application/update-deck-cards.use-case";
import { UploadDeckListUseCase } from "./application/upload-deck-list.use-case";
import { DecksController } from "./decks.controller";
import { DeckListParser } from "./domain/deck-list-parser";
import { LocalImageStorageService } from "./infrastructure/local-image-storage.service";
import { TesseractOcrAdapter } from "./infrastructure/tesseract-ocr.adapter";
import { OCR_PORT } from "./ports/ocr.port";

@Module({
  imports: [PrismaModule],
  controllers: [DecksController],
  providers: [
    UploadDeckListUseCase,
    ExtractDeckListFromImageUseCase,
    UpdateDeckCardsUseCase,
    ConfirmDeckReviewUseCase,
    DeckReviewPolicyService,
    DeckListParser,
    LocalImageStorageService,
    {
      provide: OCR_PORT,
      useClass: TesseractOcrAdapter
    }
  ]
})
export class DecksModule {}
