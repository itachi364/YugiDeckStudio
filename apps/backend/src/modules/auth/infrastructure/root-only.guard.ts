import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AuthenticatedRequest } from "./jwt-auth.guard";

@Injectable()
export class RootOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.isRoot) {
      throw new ForbiddenException("Operacion permitida solo para root.");
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException("Root debe cambiar la contrasena antes de ejecutar esta operacion.");
    }

    return true;
  }
}
