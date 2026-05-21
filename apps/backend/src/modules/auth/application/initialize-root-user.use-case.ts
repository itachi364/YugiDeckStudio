import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { SYSTEM_PERMISSIONS } from "../domain/system-permissions";
import { SYSTEM_ROLES } from "../domain/system-roles";
import { PASSWORD_HASHER_PORT, PasswordHasherPort } from "../ports/password-hasher.port";

export interface InitializeRootUserResult {
  userId: string;
  username: string;
  mustChangePassword: boolean;
  roles: string[];
}

@Injectable()
export class InitializeRootUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(): Promise<InitializeRootUserResult> {
    const existingRoot = await this.prisma.user.findFirst({
      where: {
        isRoot: true
      },
      select: {
        id: true
      }
    });

    if (existingRoot) {
      throw new ConflictException("Ya existe un usuario root en la aplicacion.");
    }

    const username = this.configService.get<string>("ROOT_DEFAULT_USERNAME") ?? "root";
    const defaultPassword = this.configService.get<string>("ROOT_DEFAULT_PASSWORD") ?? "ChangeMe123!";
    const passwordHash = await this.passwordHasher.hash(defaultPassword);

    const result = await this.prisma.$transaction(async (transaction) => {
      const rootRole = await transaction.role.upsert({
        where: {
          name: SYSTEM_ROLES.ROOT
        },
        update: {
          isSystemRole: true
        },
        create: {
          name: SYSTEM_ROLES.ROOT,
          description: "Usuario root global de la aplicacion.",
          isSystemRole: true
        },
        select: {
          id: true,
          name: true
        }
      });
      const securityPermission = await transaction.permission.upsert({
        where: {
          code: SYSTEM_PERMISSIONS.SECURITY_MANAGE
        },
        update: {
          description: "Administrar roles, permisos y asignaciones."
        },
        create: {
          code: SYSTEM_PERMISSIONS.SECURITY_MANAGE,
          description: "Administrar roles, permisos y asignaciones."
        },
        select: {
          id: true
        }
      });

      await transaction.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: rootRole.id,
            permissionId: securityPermission.id
          }
        },
        update: {},
        create: {
          roleId: rootRole.id,
          permissionId: securityPermission.id
        }
      });

      await Promise.all([
        transaction.role.upsert({
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
          }
        }),
        transaction.role.upsert({
          where: {
            name: SYSTEM_ROLES.OPERATOR
          },
          update: {
            isSystemRole: true
          },
          create: {
            name: SYSTEM_ROLES.OPERATOR,
            description: "Operador de tienda.",
            isSystemRole: true
          }
        })
      ]);

      const rootUser = await transaction.user.create({
        data: {
          username,
          passwordHash,
          displayName: "Root",
          isRoot: true,
          mustChangePassword: true,
          isActive: true,
          userRoles: {
            create: {
              roleId: rootRole.id
            }
          }
        },
        select: {
          id: true,
          username: true,
          mustChangePassword: true
        }
      });

      return {
        rootUser,
        rootRole
      };
    });

    return {
      userId: result.rootUser.id,
      username: result.rootUser.username,
      mustChangePassword: result.rootUser.mustChangePassword,
      roles: [result.rootRole.name]
    };
  }
}
