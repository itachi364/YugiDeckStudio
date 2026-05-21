import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
  constructor(private readonly uploadDeckListUseCase: UploadDeckListUseCase) {}

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
}
