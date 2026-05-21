import { BadRequestException, CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { StoreAccessPolicyService } from "../application/store-access-policy.service";
import { AuthenticatedRequest } from "./jwt-auth.guard";

@Injectable()
export class StoreScopeGuard implements CanActivate {
  constructor(private readonly storeAccessPolicy: StoreAccessPolicyService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { body?: { storeId?: string }; params?: { storeId?: string } }>();
    const storeId = request.params?.storeId ?? request.body?.storeId;

    if (!storeId) {
      throw new BadRequestException("storeId es requerido para validar alcance de tienda.");
    }

    this.storeAccessPolicy.assertCanAccessStore(request.user, storeId);
    return true;
  }
}
