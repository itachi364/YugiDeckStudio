import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsString, Min, MinLength, ValidateNested } from "class-validator";
import { DeckSection } from "@prisma/client";

export class CorrectedDeckCardDto {
  @IsEnum(DeckSection)
  section!: DeckSection;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MinLength(2)
  originalName!: string;

  @IsInt()
  @Min(1)
  displayOrder!: number;
}

export class UpdateDeckCardsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectedDeckCardDto)
  cards!: CorrectedDeckCardDto[];
}
