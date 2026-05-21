import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AUTH_TOKEN_PORT, AuthTokenPort } from "../ports/auth-token.port";
import { PASSWORD_HASHER_PORT, PasswordHasherPort } from "../ports/password-hasher.port";

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    storeId: string | null;
    isRoot: boolean;
    mustChangePassword: boolean;
    roles: string[];
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: PasswordHasherPort,
    @Inject(AUTH_TOKEN_PORT) private readonly authToken: AuthTokenPort
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: {
        username: input.username.trim()
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        storeId: true,
        passwordHash: true,
        isRoot: true,
        mustChangePassword: true,
        isActive: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciales invalidas.");
    }

    const passwordMatches = await this.passwordHasher.verify(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Credenciales invalidas.");
    }

    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const token = await this.authToken.sign({
      sub: user.id,
      username: user.username,
      storeId: user.storeId,
      isRoot: user.isRoot,
      mustChangePassword: user.mustChangePassword,
      roles
    });

    return {
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        storeId: user.storeId,
        isRoot: user.isRoot,
        mustChangePassword: user.mustChangePassword,
        roles
      }
    };
  }
}
