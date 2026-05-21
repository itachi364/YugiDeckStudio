import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionGuard } from "../src/modules/auth/infrastructure/permission.guard";

describe("PermissionGuard", () => {
  const getAllAndOverride = jest.fn();
  const findPermissions = jest.fn();
  const guard = new PermissionGuard(
    {
      getAllAndOverride
    } as unknown as Reflector,
    {
      permission: {
        findMany: findPermissions
      }
    } as never
  );

  const context = (user: unknown) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user
        })
      })
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
    getAllAndOverride.mockReturnValue(["security.manage"]);
    findPermissions.mockResolvedValue([
      {
        code: "security.manage"
      }
    ]);
  });

  it("allows root users without querying assigned permissions", async () => {
    await expect(
      guard.canActivate(
        context({
          sub: "root-id",
          isRoot: true,
          mustChangePassword: false
        })
      )
    ).resolves.toBe(true);
    expect(findPermissions).not.toHaveBeenCalled();
  });

  it("allows non-root users with required permissions", async () => {
    await expect(
      guard.canActivate(
        context({
          sub: "user-id",
          isRoot: false,
          mustChangePassword: false
        })
      )
    ).resolves.toBe(true);
    expect(findPermissions).toHaveBeenCalledWith({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: {
                  userId: "user-id"
                }
              }
            }
          }
        }
      },
      select: {
        code: true
      }
    });
  });

  it("rejects users without required permissions", async () => {
    findPermissions.mockResolvedValue([]);

    await expect(
      guard.canActivate(
        context({
          sub: "user-id",
          isRoot: false,
          mustChangePassword: false
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects users who must change their password", async () => {
    await expect(
      guard.canActivate(
        context({
          sub: "root-id",
          isRoot: true,
          mustChangePassword: true
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
