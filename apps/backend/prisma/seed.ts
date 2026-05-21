import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SYSTEM_ROLES = {
  ROOT: "root",
  STORE_ADMIN: "store_admin",
  OPERATOR: "operator"
} as const;

const SYSTEM_PERMISSIONS = {
  SECURITY_MANAGE: "security.manage",
  STORE_CONFIG_MANAGE: "store.config.manage",
  DECKS_OPERATE: "decks.operate",
  DECKS_ADMIN: "decks.admin"
} as const;

async function main() {
  const existingRoot = await prisma.user.findFirst({
    where: {
      isRoot: true
    },
    select: {
      id: true
    }
  });

  if (existingRoot) {
    return;
  }

  const userCount = await prisma.user.count();

  if (userCount > 0) {
    throw new Error("Cannot seed root after non-root users already exist.");
  }

  const username = process.env.ROOT_DEFAULT_USERNAME ?? "root";
  const password = process.env.ROOT_DEFAULT_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (transaction) => {
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
        id: true
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

    await transaction.user.create({
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
      }
    });
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
