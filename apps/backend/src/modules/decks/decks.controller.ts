import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ParseUUIDPipe } from "@nestjs/common";
import { Put } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DeckScopeGuard } from "../auth/infrastructure/deck-scope.guard";
import { CurrentUser } from "../auth/infrastructure/current-user.decorator";
import { JwtAuthGuard } from "../auth/infrastructure/jwt-auth.guard";
import { StoreScopeGuard } from "../auth/infrastructure/store-scope.guard";
import { StoreAccessPolicyService } from "../auth/application/store-access-policy.service";
import { AuthenticatedUserPayload } from "../auth/ports/auth-token.port";
import { CacheCardImagesUseCase } from "./application/cache-card-images.use-case";
import { ConfirmDeckReviewUseCase } from "./application/confirm-deck-review.use-case";
import { GenerateDeckImageUseCase } from "./application/generate-deck-image.use-case";
import { GetDeckCardsUseCase } from "./application/get-deck-cards.use-case";
import { InactivateDeckUseCase } from "./application/inactivate-deck.use-case";
import { ListDecksUseCase } from "./application/list-decks.use-case";
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
    private readonly listDecksUseCase: ListDecksUseCase,
    private readonly getDeckCardsUseCase: GetDeckCardsUseCase,
    private readonly updateDeckCardsUseCase: UpdateDeckCardsUseCase,
    private readonly confirmDeckReviewUseCase: ConfirmDeckReviewUseCase,
    private readonly cacheCardImagesUseCase: CacheCardImagesUseCase,
    private readonly generateDeckImageUseCase: GenerateDeckImageUseCase,
    private readonly inactivateDeckUseCase: InactivateDeckUseCase,
    private readonly storeAccessPolicy: StoreAccessPolicyService
  ) {}

  @Post("uploads")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("deckListImage"))
  uploadDeckList(
    @Body() body: UploadDeckListDto,
    @CurrentUser() user: AuthenticatedUserPayload,
    @UploadedFile() file?: UploadedDeckListFile
  ) {
    if (!file) {
      throw new BadRequestException("La imagen del deck list es obligatoria.");
    }

    this.storeAccessPolicy.assertCanAccessStore(user, body.storeId);

    return this.uploadDeckListUseCase.execute({
      ...body,
      file
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listDecks(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.listDecksUseCase.execute(user);
  }

  @Get(":deckId/cards")
  @UseGuards(JwtAuthGuard, DeckScopeGuard)
  getDeckCards(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.getDeckCardsUseCase.execute(deckId);
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
