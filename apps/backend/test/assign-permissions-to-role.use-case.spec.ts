import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AssignPermissionsToRoleUseCase } from "../src/modules/auth/application/assign-permissions-to-role.use-case";

describe("AssignPermissionsToRoleUseCase", () => {
  const findRole = jest.fn();
  const findPermissions = jest.fn();
  const deleteMany = jest.fn();
  const createMany = jest.fn();
  const transaction = jest.fn();
  const findRoleResult = jest.fn();
  const useCase = new AssignPermissionsToRoleUseCase({
    role: {
      findUnique: findRole
    },
    permission: {
      findMany: findPermissions
    },
    rolePermission: {
      deleteMany,
      createMany
    },
    $transaction: transaction
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findRole.mockResolvedValueOnce({
      id: "role-id"
    });
    findRole.mockImplementation(findRoleResult);
    findRoleResult.mockResolvedValue({
      id: "role-id"
    });
    findPermissions.mockResolvedValue([
      {
        id: "permission-1"
      },
      {
        id: "permission-2"
      }
    ]);
    deleteMany.mockReturnValue("delete-operation");
    createMany.mockReturnValue("create-operation");
    transaction.mockResolvedValue([]);
  });

  it("replaces permissions assigned to a role", async () => {
    await useCase.execute({
      roleId: "role-id",
      permissionIds: ["permission-1", "permission-2", "permission-2"]
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        roleId: "role-id"
      }
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          roleId: "role-id",
          permissionId: "permission-1"
        },
        {
          roleId: "role-id",
          permissionId: "permission-2"
        }
      ]
    });
    expect(transaction).toHaveBeenCalledWith(["delete-operation", "create-operation"]);
  });

  it("rejects missing roles", async () => {
    findRole.mockReset();
    findRole.mockResolvedValue(null);

    await expect(
      useCase.execute({
        roleId: "missing",
        permissionIds: []
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects missing permissions", async () => {
    findPermissions.mockResolvedValue([
      {
        id: "permission-1"
      }
    ]);

    await expect(
      useCase.execute({
        roleId: "role-id",
        permissionIds: ["permission-1", "missing"]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
