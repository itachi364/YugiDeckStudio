import { ImageAssetCategory } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UploadStoreAssetDto {
  @IsEnum(ImageAssetCategory)
  category!: ImageAssetCategory;
}
