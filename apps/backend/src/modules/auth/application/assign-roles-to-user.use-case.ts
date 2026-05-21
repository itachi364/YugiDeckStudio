import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { SYSTEM_ROLES } from "../domain/system-roles";

export interface AssignRolesToUserInput {
  userId: string;
  roleIds: string[];
}

@Injectable()
export class AssignRolesToUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: AssignRolesToUserInput) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: input.userId
      },
      select: {
        id: true,
        storeId: true,
        isRoot: true
      }
    });

    if (!user) {
      throw new NotFoundException("El usuario indicado no existe.");
    }

    const uniqueRoleIds = [...new Set(input.roleIds)];
    const roles = await this.prisma.role.findMany({
      where: {
        id: {
          in: uniqueRoleIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (roles.length !== uniqueRoleIds.length) {
      throw new BadRequestException("Uno o mas roles indicados no existen.");
    }

    if (!user.isRoot && roles.some((role) => role.name === SYSTEM_ROLES.ROOT)) {
      throw new ConflictException("No se puede asignar el rol root a un usuario no-root.");
    }

    await this.assertSingleStoreAdmin(user.id, user.storeId, roles);

    const operations = [
      this.prisma.userRole.deleteMany({
        where: {
          userId: user.id
        }
      })
    ];

    if (uniqueRoleIds.length > 0) {
      operations.push(
        this.prisma.userRole.createMany({
          data: uniqueRoleIds.map((roleId) => ({
            userId: user.id,
            roleId
          }))
        })
      );
    }

    await this.prisma.$transaction(operations);

    return this.prisma.user.findUnique({
      where: {
        id: user.id
      },
      select: {
        id: true,
        username: true,
        storeId: true,
        isRoot: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }

  private async assertSingleStoreAdmin(
    userId: string,
    storeId: string | null,
    roles: Array<{ id: string; name: string }>
  ): Promise<void> {
    const storeAdminRole = roles.find((role) => role.name === SYSTEM_ROLES.STORE_ADMIN);

    if (!storeAdminRole) {
      return;
    }

    if (!storeId) {
      throw new ConflictException("El administrador de tienda debe estar vinculado a una tienda.");
    }

    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id: {
          not: userId
        },
        storeId,
        userRoles: {
          some: {
            roleId: storeAdminRole.id
          }
        }
      },
      select: {
        id: true
      }
    });

    if (existingAdmin) {
      throw new ConflictException("La tienda ya tiene un administrador configurado.");
    }
  }
}
