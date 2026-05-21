import { ConflictException } from "@nestjs/common";
import { ConfigureFirstStoreAdminUseCase } from "../src/modules/auth/application/configure-first-store-admin.use-case";
import { SYSTEM_ROLES } from "../src/modules/auth/domain/system-roles";

describe("ConfigureFirstStoreAdminUseCase", () => {
  const transaction = jest.fn();
  const roleUpsert = jest.fn();
  const createStore = jest.fn();
  const findUser = jest.fn();
  const createUser = jest.fn();
  const hashPassword = jest.fn();
  const useCase = new ConfigureFirstStoreAdminUseCase(
    {
      $transaction: transaction
    } as never,
    {
      hash: hashPassword,
      verify: jest.fn()
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    hashPassword.mockResolvedValue("hash");
    roleUpsert.mockResolvedValue({
      id: "store-admin-role-id",
      name: SYSTEM_ROLES.STORE_ADMIN
    });
    createStore.mockResolvedValue({
      id: "store-id",
      name: "Ready For Duel"
    });
    findUser.mockResolvedValue(null);
    createUser.mockResolvedValue({
      id: "admin-id",
      username: "admin"
    });
    transaction.mockImplementation((callback) =>
      callback({
        role: {
          upsert: roleUpsert
        },
        store: {
          create: createStore,
          findUnique: jest.fn()
        },
        user: {
          findFirst: findUser,
          create: createUser
        }
      })
    );
  });

  it("creates a store and its first store admin", async () => {
    const result = await useCase.execute({
      storeName: " Ready For Duel ",
      username: "admin",
      password: "Admin123!",
      displayName: "Store Admin",
      email: "admin@example.com"
    });

    expect(createStore).toHaveBeenCalledWith({
      data: {
        name: "Ready For Duel"
      },
      select: {
        id: true,
        name: true
      }
    });
    expect(findUser).toHaveBeenNthCalledWith(1, {
      where: {
        storeId: "store-id",
        userRoles: {
          some: {
            roleId: "store-admin-role-id"
          }
        }
      },
      select: {
        id: true
      }
    });
    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: "store-id",
        username: "admin",
        email: "admin@example.com",
        passwordHash: "hash",
        isRoot: false,
        userRoles: {
          create: {
            roleId: "store-admin-role-id"
          }
        }
      }),
      select: {
        id: true,
        username: true
      }
    });
    expect(result).toEqual({
      storeId: "store-id",
      storeName: "Ready For Duel",
      adminUserId: "admin-id",
      username: "admin",
      roles: [SYSTEM_ROLES.STORE_ADMIN]
    });
  });

  it("rejects a second store admin for the same store", async () => {
    findUser.mockResolvedValueOnce({
      id: "existing-admin-id"
    });

    await expect(
      useCase.execute({
        storeName: "Ready For Duel",
        username: "admin2",
        password: "Admin123!",
        displayName: "Store Admin 2"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
