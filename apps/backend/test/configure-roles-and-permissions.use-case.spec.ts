import { ConflictException, NotFoundException } from "@nestjs/common";
import { ConfigurePermissionsUseCase } from "../src/modules/auth/application/configure-permissions.use-case";
import { ConfigureRolesUseCase } from "../src/modules/auth/application/configure-roles.use-case";

describe("ConfigureRolesUseCase", () => {
  const findRole = jest.fn();
  const createRole = jest.fn();
  const updateRole = jest.fn();
  const useCase = new ConfigureRolesUseCase({
    role: {
      findMany: jest.fn(),
      findUnique: findRole,
      create: createRole,
      update: updateRole
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findRole.mockResolvedValue(null);
    createRole.mockResolvedValue({
      id: "role-id",
      name: "judge"
    });
    updateRole.mockResolvedValue({
      id: "role-id",
      name: "judge"
    });
  });

  it("creates roles", async () => {
    await useCase.create({
      name: " judge ",
      description: "Judge"
    });

    expect(createRole).toHaveBeenCalledWith({
      data: {
        name: "judge",
        description: "Judge",
        isSystemRole: false
      }
    });
  });

  it("rejects duplicated roles", async () => {
    findRole.mockResolvedValue({
      id: "role-id"
    });

    await expect(
      useCase.create({
        name: "judge"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects updating missing roles", async () => {
    await expect(
      useCase.update({
        roleId: "missing",
        name: "judge"
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ConfigurePermissionsUseCase", () => {
  const findPermission = jest.fn();
  const createPermission = jest.fn();
  const updatePermission = jest.fn();
  const useCase = new ConfigurePermissionsUseCase({
    permission: {
      findMany: jest.fn(),
      findUnique: findPermission,
      create: createPermission,
      update: updatePermission
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findPermission.mockResolvedValue(null);
    createPermission.mockResolvedValue({
      id: "permission-id",
      code: "security.manage"
    });
    updatePermission.mockResolvedValue({
      id: "permission-id",
      code: "security.manage"
    });
  });

  it("creates permissions", async () => {
    await useCase.create({
      code: " security.manage ",
      description: "Manage security"
    });

    expect(createPermission).toHaveBeenCalledWith({
      data: {
        code: "security.manage",
        description: "Manage security"
      }
    });
  });

  it("rejects duplicated permissions", async () => {
    findPermission.mockResolvedValue({
      id: "permission-id"
    });

    await expect(
      useCase.create({
        code: "security.manage"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
