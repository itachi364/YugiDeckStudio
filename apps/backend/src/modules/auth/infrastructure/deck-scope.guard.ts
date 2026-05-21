import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { StoreAccessPolicyService } from "../application/store-access-policy.service";
import { AuthenticatedRequest } from "./jwt-auth.guard";

@Injectable()
export class DeckScopeGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeAccessPolicy: StoreAccessPolicyService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { params?: { deckId?: string } }>();
    const deckId = request.params?.deckId;

    if (!deckId) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    const deck = await this.prisma.deck.findUnique({
      where: {
        id: deckId
      },
      select: {
        storeId: true
      }
    });

    if (!deck) {
      throw new NotFoundException("El deck indicado no existe.");
    }

    this.storeAccessPolicy.assertCanAccessStore(request.user, deck.storeId);
    return true;
  }
}
