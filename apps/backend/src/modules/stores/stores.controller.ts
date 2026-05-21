import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/infrastructure/jwt-auth.guard";
import { StoreScopeGuard } from "../auth/infrastructure/store-scope.guard";
import { ConfigureEventTypesUseCase } from "./application/configure-event-types.use-case";
import { ConfigureTournamentTypesUseCase } from "./application/configure-tournament-types.use-case";
import { GetStoreConfigurationUseCase } from "./application/get-store-configuration.use-case";
import { ReplaceStoreSocialLinksUseCase } from "./application/replace-store-social-links.use-case";
import { UpdateStoreConfigurationUseCase } from "./application/update-store-configuration.use-case";
import { UploadStoreAssetUseCase } from "./application/upload-store-asset.use-case";
import { ConfigureEventTypeDto } from "./dto/configure-event-type.dto";
import { ConfigureTournamentTypeDto } from "./dto/configure-tournament-type.dto";
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
@UseGuards(JwtAuthGuard, StoreScopeGuard)
export class StoresController {
  constructor(
    private readonly getStoreConfigurationUseCase: GetStoreConfigurationUseCase,
    private readonly updateStoreConfigurationUseCase: UpdateStoreConfigurationUseCase,
    private readonly uploadStoreAssetUseCase: UploadStoreAssetUseCase,
    private readonly configureEventTypesUseCase: ConfigureEventTypesUseCase,
    private readonly configureTournamentTypesUseCase: ConfigureTournamentTypesUseCase,
    private readonly replaceStoreSocialLinksUseCase: ReplaceStoreSocialLinksUseCase
  ) {}

  @Get(":storeId")
  getStoreConfiguration(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.getStoreConfigurationUseCase.execute(storeId);
  }

  @Put(":storeId")
  updateStoreConfiguration(
    @Param("storeId", ParseUUIDPipe) storeId: string,
    @Body() body: UpdateStoreConfigurationDto
  ) {
    return this.updateStoreConfigurationUseCase.execute({
      storeId,
      ...body
    });
  }

  @Post(":storeId/assets")
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
  listEventTypes(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.configureEventTypesUseCase.list(storeId);
  }

  @Post(":storeId/event-types")
  createEventType(@Param("storeId", ParseUUIDPipe) storeId: string, @Body() body: ConfigureEventTypeDto) {
    return this.configureEventTypesUseCase.create({
      storeId,
      ...body
    });
  }

  @Put(":storeId/event-types/:eventTypeId")
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

  @Get(":storeId/tournament-types")
  listTournamentTypes(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.configureTournamentTypesUseCase.list(storeId);
  }

  @Post(":storeId/tournament-types")
  createTournamentType(@Param("storeId", ParseUUIDPipe) storeId: string, @Body() body: ConfigureTournamentTypeDto) {
    return this.configureTournamentTypesUseCase.create({
      storeId,
      ...body
    });
  }

  @Put(":storeId/tournament-types/:tournamentTypeId")
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
  listSocialLinks(@Param("storeId", ParseUUIDPipe) storeId: string) {
    return this.replaceStoreSocialLinksUseCase.list(storeId);
  }

  @Put(":storeId/social-links")
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
