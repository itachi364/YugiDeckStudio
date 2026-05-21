import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AuthenticatedRequest } from "./jwt-auth.guard";
import { REQUIRED_PERMISSIONS_KEY } from "./require-permissions.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Usuario autenticado requerido para validar permisos.");
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException("Debe cambiar la contrasena antes de ejecutar esta operacion.");
    }

    if (user.isRoot) {
      return true;
    }

    const permissions = await this.prisma.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: {
                  userId: user.sub
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
    const grantedPermissions = new Set(permissions.map((permission) => permission.code));
    const hasEveryPermission = requiredPermissions.every((permission) => grantedPermissions.has(permission));

    if (!hasEveryPermission) {
      throw new ForbiddenException("Permisos insuficientes para ejecutar esta operacion.");
    }

    return true;
  }
}
