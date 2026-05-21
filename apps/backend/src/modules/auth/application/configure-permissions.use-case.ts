import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";

export interface ConfigurePermissionInput {
  permissionId?: string;
  code: string;
  description?: string | null;
}

@Injectable()
export class ConfigurePermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.permission.findMany({
      orderBy: {
        code: "asc"
      }
    });
  }

  async create(input: ConfigurePermissionInput) {
    const existingPermission = await this.prisma.permission.findUnique({
      where: {
        code: input.code.trim()
      },
      select: {
        id: true
      }
    });

    if (existingPermission) {
      throw new ConflictException("Ya existe un permiso con el codigo indicado.");
    }

    return this.prisma.permission.create({
      data: {
        code: input.code.trim(),
        description: this.emptyToNull(input.description)
      }
    });
  }

  async update(input: ConfigurePermissionInput) {
    const permission = await this.prisma.permission.findUnique({
      where: {
        id: input.permissionId
      },
      select: {
        id: true
      }
    });

    if (!permission) {
      throw new NotFoundException("El permiso indicado no existe.");
    }

    return this.prisma.permission.update({
      where: {
        id: permission.id
      },
      data: {
        code: input.code.trim(),
        description: this.emptyToNull(input.description)
      }
    });
  }

  private emptyToNull(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
