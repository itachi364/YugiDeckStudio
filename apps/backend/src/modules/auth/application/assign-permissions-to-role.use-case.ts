import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface AssignPermissionsToRoleInput {
  roleId: string;
  permissionIds: string[];
}

@Injectable()
export class AssignPermissionsToRoleUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: AssignPermissionsToRoleInput) {
    const role = await this.prisma.role.findUnique({
      where: {
        id: input.roleId
      },
      select: {
        id: true
      }
    });

    if (!role) {
      throw new NotFoundException("El rol indicado no existe.");
    }

    const uniquePermissionIds = [...new Set(input.permissionIds)];
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: uniquePermissionIds
        }
      },
      select: {
        id: true
      }
    });

    if (permissions.length !== uniquePermissionIds.length) {
      throw new BadRequestException("Uno o mas permisos indicados no existen.");
    }

    const operations = [
      this.prisma.rolePermission.deleteMany({
        where: {
          roleId: input.roleId
        }
      })
    ];

    if (uniquePermissionIds.length > 0) {
      operations.push(
        this.prisma.rolePermission.createMany({
          data: uniquePermissionIds.map((permissionId) => ({
            roleId: input.roleId,
            permissionId
          }))
        })
      );
    }

    await this.prisma.$transaction(operations);

    return this.prisma.role.findUnique({
      where: {
        id: input.roleId
      },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
  }
}
