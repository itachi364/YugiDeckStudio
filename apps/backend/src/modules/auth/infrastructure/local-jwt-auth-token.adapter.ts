import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthenticatedUserPayload, AuthTokenPort, SignedAuthToken } from "../ports/auth-token.port";

@Injectable()
export class LocalJwtAuthTokenAdapter implements AuthTokenPort {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async sign(payload: AuthenticatedUserPayload): Promise<SignedAuthToken> {
    const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN") ?? "1d";
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getSecret(),
      expiresIn
    });

    return {
      accessToken,
      expiresIn
    };
  }

  async verify(token: string): Promise<AuthenticatedUserPayload> {
    try {
      return await this.jwtService.verifyAsync<AuthenticatedUserPayload>(token, {
        secret: this.getSecret()
      });
    } catch {
      throw new UnauthorizedException("Token de autenticacion invalido.");
    }
  }

  private getSecret(): string {
    const secret = this.configService.get<string>("JWT_SECRET");

    if (!secret || secret === "replace_with_a_local_secret") {
      throw new BadRequestException("JWT_SECRET debe configurarse para autenticacion local.");
    }

    return secret;
  }
}
