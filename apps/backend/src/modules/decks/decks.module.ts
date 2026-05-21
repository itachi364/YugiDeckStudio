import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { UploadDeckListUseCase } from "./application/upload-deck-list.use-case";
import { DecksController } from "./decks.controller";
import { LocalImageStorageService } from "./infrastructure/local-image-storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [DecksController],
  providers: [UploadDeckListUseCase, LocalImageStorageService]
})
export class DecksModule {}
