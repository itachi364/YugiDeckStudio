import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ConfigureEventTypesUseCase } from "./application/configure-event-types.use-case";
import { ConfigureTournamentTypesUseCase } from "./application/configure-tournament-types.use-case";
import { CreateStoreUseCase } from "./application/create-store.use-case";
import { GetStoreConfigurationUseCase } from "./application/get-store-configuration.use-case";
import { ListStoreAssetsUseCase } from "./application/list-store-assets.use-case";
import { ListVisibleStoresUseCase } from "./application/list-visible-stores.use-case";
import { ReplaceStoreSocialLinksUseCase } from "./application/replace-store-social-links.use-case";
import { StoreAssetPolicyService } from "./application/store-asset-policy.service";
import { UpdateStoreConfigurationUseCase } from "./application/update-store-configuration.use-case";
import { UploadStoreAssetUseCase } from "./application/upload-store-asset.use-case";
import { LocalStoreAssetStorageService } from "./infrastructure/local-store-asset-storage.service";
import { StoresController } from "./stores.controller";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [StoresController],
  providers: [
    GetStoreConfigurationUseCase,
    CreateStoreUseCase,
    ListVisibleStoresUseCase,
    ListStoreAssetsUseCase,
    UpdateStoreConfigurationUseCase,
    UploadStoreAssetUseCase,
    ConfigureEventTypesUseCase,
    ConfigureTournamentTypesUseCase,
    ReplaceStoreSocialLinksUseCase,
    StoreAssetPolicyService,
    LocalStoreAssetStorageService
  ]
})
export class StoresModule {}
