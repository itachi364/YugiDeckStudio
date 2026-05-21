import { ConflictException } from "@nestjs/common";
import { AssignRolesToUserUseCase } from "../src/modules/auth/application/assign-roles-to-user.use-case";
import { SYSTEM_ROLES } from "../src/modules/auth/domain/system-roles";

describe("AssignRolesToUserUseCase", () => {
  const findUser = jest.fn();
  const findRoles = jest.fn();
  const deleteMany = jest.fn();
  const createMany = jest.fn();
  const transaction = jest.fn();
  const useCase = new AssignRolesToUserUseCase({
    user: {
      findUnique: findUser,
      findFirst: jest.fn()
    },
    role: {
      findMany: findRoles
    },
    userRole: {
      deleteMany,
      createMany
    },
    $transaction: transaction
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.mockResolvedValue({
      id: "user-id",
      storeId: "store-id",
      isRoot: false
    });
    findRoles.mockResolvedValue([
      {
        id: "operator-role-id",
        name: SYSTEM_ROLES.OPERATOR
      }
    ]);
    deleteMany.mockReturnValue("delete-operation");
    createMany.mockReturnValue("create-operation");
    transaction.mockResolvedValue([]);
  });

  it("replaces roles assigned to a user", async () => {
    await useCase.execute({
      userId: "user-id",
      roleIds: ["operator-role-id", "operator-role-id"]
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-id"
      }
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: "user-id",
          roleId: "operator-role-id"
        }
      ]
    });
    expect(transaction).toHaveBeenCalledWith(["delete-operation", "create-operation"]);
  });

  it("rejects assigning root role to non-root users", async () => {
    findRoles.mockResolvedValue([
      {
        id: "root-role-id",
        name: SYSTEM_ROLES.ROOT
      }
    ]);

    await expect(
      useCase.execute({
        userId: "user-id",
        roleIds: ["root-role-id"]
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects assigning store admin when the store already has one", async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: "existing-admin-id"
    });
    const isolatedUseCase = new AssignRolesToUserUseCase({
      user: {
        findUnique: findUser,
        findFirst
      },
      role: {
        findMany: findRoles
      },
      userRole: {
        deleteMany,
        createMany
      },
      $transaction: transaction
    } as never);
    findRoles.mockResolvedValue([
      {
        id: "store-admin-role-id",
        name: SYSTEM_ROLES.STORE_ADMIN
      }
    ]);

    await expect(
      isolatedUseCase.execute({
        userId: "user-id",
        roleIds: ["store-admin-role-id"]
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
