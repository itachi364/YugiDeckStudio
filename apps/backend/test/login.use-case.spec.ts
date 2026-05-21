import { UnauthorizedException } from "@nestjs/common";
import { LoginUseCase } from "../src/modules/auth/application/login.use-case";

describe("LoginUseCase", () => {
  const findUser = jest.fn();
  const verifyPassword = jest.fn();
  const signToken = jest.fn();
  const useCase = new LoginUseCase(
    {
      user: {
        findUnique: findUser
      }
    } as never,
    {
      hash: jest.fn(),
      verify: verifyPassword
    },
    {
      sign: signToken,
      verify: jest.fn()
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.mockResolvedValue({
      id: "user-id",
      username: "root",
      displayName: "Root",
      storeId: null,
      passwordHash: "hash",
      isRoot: true,
      mustChangePassword: true,
      isActive: true,
      userRoles: [
        {
          role: {
            name: "root"
          }
        }
      ]
    });
    verifyPassword.mockResolvedValue(true);
    signToken.mockResolvedValue({
      accessToken: "token",
      expiresIn: "1d"
    });
  });

  it("returns a JWT and forces root password change when required", async () => {
    const result = await useCase.execute({
      username: " root ",
      password: "ChangeMe123!"
    });

    expect(findUser).toHaveBeenCalledWith({
      where: {
        username: "root"
      },
      select: expect.any(Object)
    });
    expect(signToken).toHaveBeenCalledWith({
      sub: "user-id",
      username: "root",
      storeId: null,
      isRoot: true,
      mustChangePassword: true,
      roles: ["root"]
    });
    expect(result).toEqual({
      accessToken: "token",
      expiresIn: "1d",
      user: {
        id: "user-id",
        username: "root",
        displayName: "Root",
        storeId: null,
        isRoot: true,
        mustChangePassword: true,
        roles: ["root"]
      }
    });
  });

  it("rejects invalid passwords", async () => {
    verifyPassword.mockResolvedValue(false);

    await expect(
      useCase.execute({
        username: "root",
        password: "wrong"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
