import { IsArray, IsUUID } from "class-validator";

export class AssignPermissionsToRoleDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  permissionIds!: string[];
}
