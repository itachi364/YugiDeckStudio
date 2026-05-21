import { BadRequestException, Body, Controller, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { ParseUUIDPipe } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ExtractDeckListFromImageUseCase } from "./application/extract-deck-list.use-case";
import { UploadDeckListUseCase } from "./application/upload-deck-list.use-case";
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
    private readonly extractDeckListFromImageUseCase: ExtractDeckListFromImageUseCase
  ) {}

  @Post("uploads")
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
  extractDeckList(@Param("deckId", ParseUUIDPipe) deckId: string) {
    return this.extractDeckListFromImageUseCase.execute(deckId);
  }
}
