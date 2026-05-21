import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthenticatedUserPayload } from "../ports/auth-token.port";

@Injectable()
export class StoreAccessPolicyService {
  assertCanAccessStore(user: AuthenticatedUserPayload | undefined, storeId: string): void {
    if (!user) {
      throw new UnauthorizedException("Usuario autenticado requerido.");
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException("Debe cambiar la contrasena antes de ejecutar esta operacion.");
    }

    if (user.isRoot) {
      return;
    }

    if (!user.storeId) {
      throw new ForbiddenException("El usuario no-root debe estar vinculado a una tienda.");
    }

    if (user.storeId !== storeId) {
      throw new ForbiddenException("No tiene acceso a informacion de otra tienda.");
    }
  }
}
