import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { AUTH_TOKEN_PORT, AuthenticatedUserPayload, AuthTokenPort } from "../ports/auth-token.port";

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AUTH_TOKEN_PORT) private readonly authToken: AuthTokenPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    request.user = await this.authToken.verify(token);
    return true;
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de autenticacion requerido.");
    }

    return authorization.slice("Bearer ".length).trim();
  }
}
