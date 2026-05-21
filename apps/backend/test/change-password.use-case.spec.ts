import { UnauthorizedException } from "@nestjs/common";
import { ChangePasswordUseCase } from "../src/modules/auth/application/change-password.use-case";

describe("ChangePasswordUseCase", () => {
  const findUser = jest.fn();
  const updateUser = jest.fn();
  const verifyPassword = jest.fn();
  const hashPassword = jest.fn();
  const useCase = new ChangePasswordUseCase(
    {
      user: {
        findUnique: findUser,
        update: updateUser
      }
    } as never,
    {
      verify: verifyPassword,
      hash: hashPassword
    }
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUser.mockResolvedValue({
      id: "user-id",
      passwordHash: "old-hash"
    });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("new-hash");
    updateUser.mockResolvedValue({
      id: "user-id",
      mustChangePassword: false
    });
  });

  it("updates the password hash and clears mandatory change flag", async () => {
    const result = await useCase.execute({
      userId: "user-id",
      currentPassword: "ChangeMe123!",
      newPassword: "NewPassword123!"
    });

    expect(updateUser).toHaveBeenCalledWith({
      where: {
        id: "user-id"
      },
      data: {
        passwordHash: "new-hash",
        mustChangePassword: false
      },
      select: {
        id: true,
        mustChangePassword: true
      }
    });
    expect(result).toEqual({
      userId: "user-id",
      mustChangePassword: false
    });
  });

  it("rejects invalid current passwords", async () => {
    verifyPassword.mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: "user-id",
        currentPassword: "wrong",
        newPassword: "NewPassword123!"
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
