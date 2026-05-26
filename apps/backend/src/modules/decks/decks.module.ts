import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CacheCardImagesUseCase } from "./application/cache-card-images.use-case";
import { DeckCompositionPolicyService } from "./application/deck-composition-policy.service";
import { ConfirmDeckReviewUseCase } from "./application/confirm-deck-review.use-case";
import { DeckReviewPolicyService } from "./application/deck-review-policy.service";
import { GenerateDeckImageUseCase } from "./application/generate-deck-image.use-case";
import { GetDeckCardsUseCase } from "./application/get-deck-cards.use-case";
import { InactivateDeckUseCase } from "./application/inactivate-deck.use-case";
import { ListDecksUseCase } from "./application/list-decks.use-case";
import { UpdateDeckCardsUseCase } from "./application/update-deck-cards.use-case";
import { UploadDeckListUseCase } from "./application/upload-deck-list.use-case";
import { DecksController } from "./decks.controller";
import { CardNameAliasCatalog } from "./domain/card-name-alias-catalog";
import { CardNameNormalizer } from "./domain/card-name-normalizer";
import { KonamiNeuronDeckImportAdapter } from "./infrastructure/konami-neuron-deck-import.adapter";
import { LocalCardImageStorageAdapter } from "./infrastructure/local-card-image-storage.adapter";
import { LocalImageStorageService } from "./infrastructure/local-image-storage.service";
import { NodeCanvasDeckImageRendererAdapter } from "./infrastructure/node-canvas-deck-image-renderer.adapter";
import { PostgresDeckPersistenceRepository } from "./infrastructure/postgres-deck-persistence.repository";
import { YgoprodeckCardCatalogAdapter } from "./infrastructure/ygoprodeck-card-catalog.adapter";
import { CARD_IMAGE_STORAGE_PORT } from "./ports/card-image-storage.port";
import { CARD_NAME_RESOLVER_PORT } from "./ports/card-name-resolver.port";
import { DECK_PERSISTENCE_REPOSITORY } from "./ports/deck-persistence.repository";
import { DECK_IMAGE_RENDERER_PORT } from "./ports/deck-image-renderer.port";
import { NEURON_DECK_IMPORT_PORT } from "./ports/neuron-deck-import.port";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DecksController],
  providers: [
    UploadDeckListUseCase,
    ListDecksUseCase,
    GetDeckCardsUseCase,
    UpdateDeckCardsUseCase,
    ConfirmDeckReviewUseCase,
    DeckCompositionPolicyService,
    DeckReviewPolicyService,
    CacheCardImagesUseCase,
    GenerateDeckImageUseCase,
    InactivateDeckUseCase,
    CardNameAliasCatalog,
    CardNameNormalizer,
    LocalImageStorageService,
    {
      provide: NEURON_DECK_IMPORT_PORT,
      useClass: KonamiNeuronDeckImportAdapter
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
