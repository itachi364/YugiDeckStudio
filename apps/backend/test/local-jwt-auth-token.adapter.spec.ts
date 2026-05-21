import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { LocalJwtAuthTokenAdapter } from "../src/modules/auth/infrastructure/local-jwt-auth-token.adapter";

describe("LocalJwtAuthTokenAdapter", () => {
  const signAsync = jest.fn();
  const verifyAsync = jest.fn();
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: "test-secret",
        JWT_EXPIRES_IN: "1d"
      };

      return values[key];
    })
  } as unknown as ConfigService;

  const adapter = new LocalJwtAuthTokenAdapter(
    {
      signAsync,
      verifyAsync
    } as unknown as JwtService,
    configService
  );

  beforeEach(() => {
    jest.clearAllMocks();
    signAsync.mockResolvedValue("token");
    verifyAsync.mockResolvedValue({
      sub: "user-id"
    });
  });

  it("signs tokens with configured secret and expiration", async () => {
    const payload = {
      sub: "user-id",
      username: "root",
      storeId: null,
      isRoot: true,
      mustChangePassword: false,
      roles: ["root"]
    };

    const result = await adapter.sign(payload);

    expect(signAsync).toHaveBeenCalledWith(payload, {
      secret: "test-secret",
      expiresIn: "1d"
    });
    expect(result).toEqual({
      accessToken: "token",
      expiresIn: "1d"
    });
  });

  it("rejects placeholder JWT secrets", async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: "replace_with_a_local_secret",
        JWT_EXPIRES_IN: "1d"
      };

      return values[key];
    });

    await expect(
      adapter.sign({
        sub: "user-id",
        username: "root",
        storeId: null,
        isRoot: true,
        mustChangePassword: false,
        roles: ["root"]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
