import { ConflictException } from "@nestjs/common";
import { RegisterUserUseCase } from "../src/modules/auth/application/register-user.use-case";
import { SYSTEM_ROLES } from "../src/modules/auth/domain/system-roles";

describe("RegisterUserUseCase", () => {
  const findStore = jest.fn();
  const roleUpsert = jest.fn();
  const findUser = jest.fn();
  const createUser = jest.fn();
  const hashPassword = jest.fn();
  const useCase = new RegisterUserUseCase(
    {
      store: {
        findUnique: findStore
      },
      role: {
        upsert: roleUpsert
      },
      user: {
        findFirst: findUser,
        create: createUser
      }
    } as never,
    {
      hash: hashPassword,
      verify: jest.fn()
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findStore.mockResolvedValue({
      id: "store-id"
    });
    roleUpsert.mockResolvedValue({
      id: "operator-role-id",
      name: SYSTEM_ROLES.OPERATOR
    });
    findUser.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hash");
    createUser.mockResolvedValue({
      id: "operator-id",
      username: "operator",
      storeId: "store-id"
    });
  });

  it("registers local users with hashed passwords as store operators", async () => {
    const result = await useCase.execute({
      storeId: "store-id",
      username: "operator",
      password: "Operator123!",
      displayName: "Operator",
      email: "operator@example.com"
    });

    expect(hashPassword).toHaveBeenCalledWith("Operator123!");
    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: "store-id",
        username: "operator",
        email: "operator@example.com",
        passwordHash: "hash",
        isRoot: false,
        userRoles: {
          create: {
            roleId: "operator-role-id"
          }
        }
      }),
      select: {
        id: true,
        username: true,
        storeId: true
      }
    });
    expect(result).toEqual({
      userId: "operator-id",
      username: "operator",
      storeId: "store-id",
      roles: [SYSTEM_ROLES.OPERATOR]
    });
  });

  it("rejects duplicated username or email", async () => {
    findUser.mockResolvedValue({
      id: "existing-user-id"
    });

    await expect(
      useCase.execute({
        storeId: "store-id",
        username: "operator",
        password: "Operator123!",
        displayName: "Operator"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
