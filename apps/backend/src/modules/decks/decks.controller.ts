import { BadRequestException, Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ParseUUIDPipe } from "@nestjs/common";
import { Put } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DeckScopeGuard } from "../auth/infrastructure/deck-scope.guard";
import { CurrentUser } from "../auth/infrastructure/current-user.decorator";
import { JwtAuthGuard } from "../auth/infrastructure/jwt-auth.guard";
import { StoreScopeGuard } from "../auth/infrastructure/store-scope.guard";
import { AuthenticatedUserPayload } from "../auth/ports/auth-token.port";
import { CacheCardImagesUseCase } from "./application/cache-card-images.use-case";
import { ConfirmDeckReviewUseCase } from "./application/confirm-deck-review.use-case";
import { ExtractDeckListFromImageUseCase } from "./application/extract-deck-list.use-case";
import { GenerateDeckImageUseCase } from "./application/generate-deck-image.use-case";
import { InactivateDeckUseCase } from "./application/inactivate-deck.use-case";
import { ResolveCardNamesUseCase } from "./application/resolve-card-names.use-case";
import { UpdateDeckCardsUseCase } from "./application/update-deck-cards.use-case";
import { UploadDeckListUseCase } from "./application/upload-deck-list.use-case";
import { InactivateDeckDto } from "./dto/inactivate-deck.dto";
import { UpdateDeckCardsDto } from "./dto/update-deck-cards.dto";
import { UploadDeckListDto } from "./dto/upload-deck-list.dto";

interface UploadedDeckListFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

@Controller("api/decks")
export class DecksController {
  constructor(
    private readonly uploadDeckListUseCase: UploadDeckListUseCase,
    private readonly extractDeckListFromImageUseCase: ExtractDeckListFromImageUseCase,
    private readonly updateDeckCardsUseCase: UpdateDeckCardsUseCase,
    private readonly confirmDeckReviewUseCase: ConfirmDeckReviewUseCase,
    private readonly resolveCardNamesUseCase: ResolveCardNamesUseCase,
    private readonly cacheCardImagesUseCase: CacheCardImagesUseCase,
    private readonly generateDeckImageUseCase: GenerateDeckImageUseCase,
    private readonly inactivateDeckUseCase: InactivateDeckUseCase
  ) {}

  @Post("uploads")
  @UseGuards(JwtAuthGuard, StoreScopeGuard)
  @UseInterceptors(FileInterceptor("deckListImage"))
  uploadDeckList(@Body() body: UploadDeckListDto, @UploadedFile() file?: UploadedDeckListFile) {
    if (!file) {
      throw new BadRequestException("La imagen del deck list es obligatoria.");
    }

    return this.uploadDeckListUseCase.execute({
      ...body,
      file
    });
  }

  @Post(":deckId/extract")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  extractDeckList(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.extractDeckListFromImageUseCase.execute(deckId);
  }

  @Put(":deckId/cards")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  updateDeckCards(@Param("deckId", ParseUUIDPipe) deckId: string, @Body() body: UpdateDeckCardsDto) {
    return this.updateDeckCardsUseCase.execute({
      deckId,
      cards: body.cards
    });
  }

  @Post(":deckId/review/confirm")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  confirmDeckReview(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.confirmDeckReviewUseCase.execute(deckId);
  }

  @Post(":deckId/resolve-card-names")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  resolveCardNames(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.resolveCardNamesUseCase.execute(deckId);
  }

  @Post(":deckId/cache-card-images")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  cacheCardImages(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.cacheCardImagesUseCase.execute(deckId);
  }

  @Post(":deckId/generate-image")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  generateDeckImage(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.generateDeckImageUseCase.execute(deckId);
  }

  @Post(":deckId/inactivate")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  inactivateDeck(
    @Param("deckId", ParseUUIDPipe) deckId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
    @Body() body: InactivateDeckDto
  ) {
    return this.inactivateDeckUseCase.execute({
      deckId,
      user,
      reason: body.reason
    });
  }
}
