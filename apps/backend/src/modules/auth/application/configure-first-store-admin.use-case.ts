import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { SYSTEM_ROLES } from "../domain/system-roles";
import { PASSWORD_HASHER_PORT, PasswordHasherPort } from "../ports/password-hasher.port";

export interface ConfigureFirstStoreAdminInput {
  storeId?: string;
  storeName?: string;
  username: string;
  password: string;
  displayName: string;
  email?: string;
}

export interface ConfigureFirstStoreAdminResult {
  storeId: string;
  storeName: string;
  adminUserId: string;
  username: string;
  roles: string[];
}

@Injectable()
export class ConfigureFirstStoreAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(input: ConfigureFirstStoreAdminInput): Promise<ConfigureFirstStoreAdminResult> {
    this.validateInput(input);

    const passwordHash = await this.passwordHasher.hash(input.password);
    const result = await this.prisma.$transaction(async (transaction) => {
      const role = await transaction.role.upsert({
        where: {
          name: SYSTEM_ROLES.STORE_ADMIN
        },
        update: {
          isSystemRole: true
        },
        create: {
          name: SYSTEM_ROLES.STORE_ADMIN,
          description: "Administrador de tienda.",
          isSystemRole: true
        },
        select: {
          id: true,
          name: true
        }
      });
      const store = input.storeId
        ? await transaction.store.findUnique({
            where: {
              id: input.storeId
            },
            select: {
              id: true,
              name: true
            }
          })
        : await transaction.store.create({
            data: {
              name: input.storeName?.trim() ?? ""
            },
            select: {
              id: true,
              name: true
            }
          });

      if (!store) {
        throw new NotFoundException("La tienda indicada no existe.");
      }

      const existingAdmin = await transaction.user.findFirst({
        where: {
          storeId: store.id,
          userRoles: {
            some: {
              roleId: role.id
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

      const existingUser = await transaction.user.findFirst({
        where: {
          OR: [{ username: input.username.trim() }, ...(input.email ? [{ email: input.email.trim() }] : [])]
        },
        select: {
          id: true
        }
      });

      if (existingUser) {
        throw new ConflictException("Ya existe un usuario con el username o email indicado.");
      }

      const admin = await transaction.user.create({
        data: {
          storeId: store.id,
          username: input.username.trim(),
          email: input.email?.trim(),
          passwordHash,
          displayName: input.displayName.trim(),
          isRoot: false,
          mustChangePassword: false,
          isActive: true,
          userRoles: {
            create: {
              roleId: role.id
            }
          }
        },
        select: {
          id: true,
          username: true
        }
      });

      return {
        store,
        admin,
        role
      };
    });

    return {
      storeId: result.store.id,
      storeName: result.store.name,
      adminUserId: result.admin.id,
      username: result.admin.username,
      roles: [result.role.name]
    };
  }

  private validateInput(input: ConfigureFirstStoreAdminInput): void {
    if (!input.storeId && !input.storeName?.trim()) {
      throw new BadRequestException("Debe indicar storeId o storeName.");
    }

    if (input.password.length < 8) {
      throw new BadRequestException("La contrasena debe tener al menos 8 caracteres.");
    }

    const requiredFields = [
      ["username", input.username],
      ["displayName", input.displayName]
    ];
    const missingFields = requiredFields.filter(([, value]) => !value?.trim());

    if (missingFields.length > 0) {
      throw new BadRequestException(`Campos obligatorios faltantes: ${missingFields.map(([field]) => field).join(", ")}.`);
    }
  }
}
