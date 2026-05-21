import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InitializeRootUserUseCase } from "../src/modules/auth/application/initialize-root-user.use-case";
import { SYSTEM_ROLES } from "../src/modules/auth/domain/system-roles";

describe("InitializeRootUserUseCase", () => {
  const findRoot = jest.fn();
  const transaction = jest.fn();
  const roleUpsert = jest.fn();
  const permissionUpsert = jest.fn();
  const rolePermissionUpsert = jest.fn();
  const userCreate = jest.fn();
  const hashPassword = jest.fn();
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        ROOT_DEFAULT_USERNAME: "root",
        ROOT_DEFAULT_PASSWORD: "ChangeMe123!"
      };

      return values[key];
    })
  } as unknown as ConfigService;
  const useCase = new InitializeRootUserUseCase(
    {
      user: {
        findFirst: findRoot
      },
      $transaction: transaction
    } as never,
    configService,
    {
      hash: hashPassword,
      verify: jest.fn()
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findRoot.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hash");
    roleUpsert.mockImplementation(({ where }) =>
      Promise.resolve({
        id: `${where.name}-role-id`,
        name: where.name
      })
    );
    permissionUpsert.mockResolvedValue({
      id: "security-manage-permission-id"
    });
    rolePermissionUpsert.mockResolvedValue({});
    userCreate.mockResolvedValue({
      id: "root-id",
      username: "root",
      mustChangePassword: true
    });
    transaction.mockImplementation((callback) =>
      callback({
        role: {
          upsert: roleUpsert
        },
        permission: {
          upsert: permissionUpsert
        },
        rolePermission: {
          upsert: rolePermissionUpsert
        },
        user: {
          create: userCreate
        }
      })
    );
  });

  it("creates the unique root user with mandatory password change", async () => {
    const result = await useCase.execute();

    expect(roleUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { name: SYSTEM_ROLES.ROOT } }));
    expect(roleUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { name: SYSTEM_ROLES.STORE_ADMIN } }));
    expect(roleUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { name: SYSTEM_ROLES.OPERATOR } }));
    expect(rolePermissionUpsert).toHaveBeenCalledWith({
      where: {
        roleId_permissionId: {
          roleId: "root-role-id",
          permissionId: "security-manage-permission-id"
        }
      },
      update: {},
      create: {
        roleId: "root-role-id",
        permissionId: "security-manage-permission-id"
      }
    });
    expect(userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: "root",
        passwordHash: "hash",
        isRoot: true,
        mustChangePassword: true,
        userRoles: {
          create: {
            roleId: "root-role-id"
          }
        }
      }),
      select: {
        id: true,
        username: true,
        mustChangePassword: true
      }
    });
    expect(result).toEqual({
      userId: "root-id",
      username: "root",
      mustChangePassword: true,
      roles: ["root"]
    });
  });

  it("rejects creating another root", async () => {
    findRoot.mockResolvedValue({
      id: "root-id"
    });

    await expect(useCase.execute()).rejects.toBeInstanceOf(ConflictException);
  });
});
