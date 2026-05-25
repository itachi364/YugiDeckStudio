import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CacheCardImagesUseCase } from "./application/cache-card-images.use-case";
import { ConfirmDeckReviewUseCase } from "./application/confirm-deck-review.use-case";
import { DeckReviewPolicyService } from "./application/deck-review-policy.service";
import { ExtractDeckListFromImageUseCase } from "./application/extract-deck-list.use-case";
import { GenerateDeckImageUseCase } from "./application/generate-deck-image.use-case";
import { InactivateDeckUseCase } from "./application/inactivate-deck.use-case";
import { ResolveCardNamesUseCase } from "./application/resolve-card-names.use-case";
import { UpdateDeckCardsUseCase } from "./application/update-deck-cards.use-case";
import { UploadDeckListUseCase } from "./application/upload-deck-list.use-case";
import { DecksController } from "./decks.controller";
import { CardNameAliasCatalog } from "./domain/card-name-alias-catalog";
import { CardNameNormalizer } from "./domain/card-name-normalizer";
import { DeckListParser } from "./domain/deck-list-parser";
import { LocalCardImageStorageAdapter } from "./infrastructure/local-card-image-storage.adapter";
import { LocalImageStorageService } from "./infrastructure/local-image-storage.service";
import { NodeCanvasDeckImageRendererAdapter } from "./infrastructure/node-canvas-deck-image-renderer.adapter";
import { PostgresDeckPersistenceRepository } from "./infrastructure/postgres-deck-persistence.repository";
import { TesseractOcrAdapter } from "./infrastructure/tesseract-ocr.adapter";
import { YgoprodeckCardCatalogAdapter } from "./infrastructure/ygoprodeck-card-catalog.adapter";
import { CARD_IMAGE_STORAGE_PORT } from "./ports/card-image-storage.port";
import { CARD_NAME_RESOLVER_PORT } from "./ports/card-name-resolver.port";
import { DECK_PERSISTENCE_REPOSITORY } from "./ports/deck-persistence.repository";
import { DECK_IMAGE_RENDERER_PORT } from "./ports/deck-image-renderer.port";
import { OCR_PORT } from "./ports/ocr.port";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DecksController],
  providers: [
    UploadDeckListUseCase,
    ExtractDeckListFromImageUseCase,
    UpdateDeckCardsUseCase,
    ConfirmDeckReviewUseCase,
    DeckReviewPolicyService,
    ResolveCardNamesUseCase,
    CacheCardImagesUseCase,
    GenerateDeckImageUseCase,
    InactivateDeckUseCase,
    CardNameAliasCatalog,
    CardNameNormalizer,
    DeckListParser,
    LocalImageStorageService,
    {
      provide: OCR_PORT,
      useClass: TesseractOcrAdapter
    },
    {
      provide: CARD_NAME_RESOLVER_PORT,
      useClass: YgoprodeckCardCatalogAdapter
    },
    {
      provide: CARD_IMAGE_STORAGE_PORT,
      useClass: LocalCardImageStorageAdapter
    },
    {
      provide: DECK_IMAGE_RENDERER_PORT,
      useClass: NodeCanvasDeckImageRendererAdapter
    },
    {
      provide: DECK_PERSISTENCE_REPOSITORY,
      useClass: PostgresDeckPersistenceRepository
    }
  ]
})
export class DecksModule {}
