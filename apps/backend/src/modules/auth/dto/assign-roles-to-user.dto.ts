import { IsArray, IsUUID } from "class-validator";

export class AssignRolesToUserDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}
