import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ImageAssetCategory } from "@prisma/client";
import { CurrentUser } from "../auth/infrastructure/current-user.decorator";
import { JwtAuthGuard } from "../auth/infrastructure/jwt-auth.guard";
import { RootOnlyGuard } from "../auth/infrastructure/root-only.guard";
import { StoreScopeGuard } from "../auth/infrastructure/store-scope.guard";
import { AuthenticatedUserPayload } from "../auth/ports/auth-token.port";
import { ConfigureEventTypesUseCase } from "./application/configure-event-types.use-case";
import { ConfigureTournamentTypesUseCase } from "./application/configure-tournament-types.use-case";
import { CreateStoreUseCase } from "./application/create-store.use-case";
import { GetStoreConfigurationUseCase } from "./application/get-store-configuration.use-case";
import { ListStoreAssetsUseCase } from "./application/list-store-assets.use-case";
import { ListVisibleStoresUseCase } from "./application/list-visible-stores.use-case";
import { ReplaceStoreSocialLinksUseCase } from "./application/replace-store-social-links.use-case";
import { UpdateStoreConfigurationUseCase } from "./application/update-store-configuration.use-case";
import { UploadStoreAssetUseCase } from "./application/upload-store-asset.use-case";
import { ConfigureEventTypeDto } from "./dto/configure-event-type.dto";
import { ConfigureTournamentTypeDto } from "./dto/configure-tournament-type.dto";
import { CreateStoreDto } from "./dto/create-store.dto";
import { ReplaceStoreSocialLinksDto } from "./dto/replace-store-social-links.dto";
import { UpdateStoreConfigurationDto } from "./dto/update-store-configuration.dto";
import { UploadStoreAssetDto } from "./dto/upload-store-asset.dto";

interface UploadedStoreAssetFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

@Controller("api/stores")
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(
    private readonly getStoreConfigurationUseCase: GetStoreConfigurationUseCase,
    private readonly updateStoreConfigurationUseCase: UpdateStoreConfigurationUseCase,
    private readonly uploadStoreAssetUseCase: UploadStoreAssetUseCase,
    private readonly configureEventTypesUseCase: ConfigureEventTypesUseCase,
    private readonly configureTournamentTypesUseCase: ConfigureTournamentTypesUseCase,
    private readonly replaceStoreSocialLinksUseCase: ReplaceStoreSocialLinksUseCase,
    private readonly listVisibleStoresUseCase: ListVisibleStoresUseCase,
    private readonly listStoreAssetsUseCase: ListStoreAssetsUseCase,
    private readonly createStoreUseCase: CreateStoreUseCase
  ) {}

  @Get()
  listVisibleStores(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.listVisibleStoresUseCase.execute(user);
  }

  @Get("event-types")
  listVisibleEventTypes(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.configureEventTypesUseCase.listVisibleForUser(user);
  }

  @Post()
  @UseGuards(RootOnlyGuard)
  createStore(@Body() body: CreateStoreDto) {
    return this.createStoreUseCase.execute(body);
  }

  @Get(":storeId")
  @UseGuards(StoreScopeGuard)
  getStoreConfiguration(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.getStoreConfigurationUseCase.execute(storeId);
  }

  @Put(":storeId")
  @UseGuards(StoreScopeGuard)
  updateStoreConfiguration(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Body() body: UpdateStoreConfigurationDto
  ) {
    return this.updateStoreConfigurationUseCase.execute({
      storeId,
      ...body
    });
  }

  @Get(":storeId/assets")
  @UseGuards(StoreScopeGuard)
  listStoreAssets(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Query("category") category?: ImageAssetCategory
  ) {
    return this.listStoreAssetsUseCase.execute({
      storeId,
      category
    });
  }

  @Post(":storeId/assets")
  @UseGuards(StoreScopeGuard)
  @UseInterceptors(FileInterceptor("image"))
  uploadStoreAsset(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Body() body: UploadStoreAssetDto,
    @UploadedFile() file?: UploadedStoreAssetFile
  ) {
    if (!file) {
      throw new BadRequestException("La imagen configurable es obligatoria.");
    }

    return this.uploadStoreAssetUseCase.execute({
      storeId,
      category: body.category,
      file
    });
  }

  @Get(":storeId/event-types")
  @UseGuards(StoreScopeGuard)
  listEventTypes(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.configureEventTypesUseCase.list(storeId);
  }

  @Post(":storeId/event-types")
  @UseGuards(StoreScopeGuard)
  createEventType(@Param("storeId", ParseUUIDPipe) storeId: string, @Body() body: ConfigureEventTypeDto) {
    return this.configureEventTypesUseCase.create({
      storeId,
      ...body
    });
  }

  @Put(":storeId/event-types/:eventTypeId")
  @UseGuards(StoreScopeGuard)
  updateEventType(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Param("eventTypeId", ParseUUIDPipe) eventTypeId: string,
    @Body() body: ConfigureEventTypeDto
  ) {
    return this.configureEventTypesUseCase.update({
      storeId,
      eventTypeId,
      ...body
    });
  }

  @Delete(":storeId/event-types/:eventTypeId")
  @UseGuards(StoreScopeGuard)
  deleteEventType(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Param("eventTypeId", ParseUUIDPipe) eventTypeId: string
  ) {
    return this.configureEventTypesUseCase.softDelete({
      currentUser: user,
      storeId,
      eventTypeId
    });
  }

  @Get(":storeId/tournament-types")
  @UseGuards(StoreScopeGuard)
  listTournamentTypes(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.configureTournamentTypesUseCase.list(storeId);
  }

  @Post(":storeId/tournament-types")
  @UseGuards(StoreScopeGuard)
  createTournamentType(@Param("storeId", ParseUUIDPipe) storeId: string, @Body() body: ConfigureTournamentTypeDto) {
    return this.configureTournamentTypesUseCase.create({
      storeId,
      ...body
    });
  }

  @Put(":storeId/tournament-types/:tournamentTypeId")
  @UseGuards(StoreScopeGuard)
  updateTournamentType(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Param("tournamentTypeId", ParseUUIDPipe) tournamentTypeId: string,
    @Body() body: ConfigureTournamentTypeDto
  ) {
    return this.configureTournamentTypesUseCase.update({
      storeId,
      tournamentTypeId,
      ...body
    });
  }

  @Get(":storeId/social-links")
  @UseGuards(StoreScopeGuard)
  listSocialLinks(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.replaceStoreSocialLinksUseCase.list(storeId);
  }

  @Put(":storeId/social-links")
  @UseGuards(StoreScopeGuard)
  replaceSocialLinks(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Body() body: ReplaceStoreSocialLinksDto
  ) {
    return this.replaceStoreSocialLinksUseCase.execute({
      storeId,
      links: body.links
    });
  }
}
