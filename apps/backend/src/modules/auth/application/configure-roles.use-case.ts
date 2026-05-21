import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface ConfigureRoleInput {
  roleId?: string;
  name: string;
  description?: string | null;
  isSystemRole?: boolean;
}

@Injectable()
export class ConfigureRolesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.role.findMany({
      orderBy: {
        name: "asc"
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

  async create(input: ConfigureRoleInput) {
    const existingRole = await this.prisma.role.findUnique({
      where: {
        name: input.name.trim()
      },
      select: {
        id: true
      }
    });

    if (existingRole) {
      throw new ConflictException("Ya existe un rol con el nombre indicado.");
    }

    return this.prisma.role.create({
      data: {
        name: input.name.trim(),
        description: this.emptyToNull(input.description),
        isSystemRole: input.isSystemRole ?? false
      }
    });
  }

  async update(input: ConfigureRoleInput) {
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

    return this.prisma.role.update({
      where: {
        id: role.id
      },
      data: {
        name: input.name.trim(),
        description: this.emptyToNull(input.description),
        isSystemRole: input.isSystemRole ?? false
      }
    });
  }

  private emptyToNull(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
