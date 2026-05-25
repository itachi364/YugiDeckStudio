import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AuthenticatedUserPayload } from "../../auth/ports/auth-token.port";

@Injectable()
export class ListVisibleStoresUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(user: AuthenticatedUserPayload) {
    if (!user.isRoot && !user.storeId) {
      throw new ForbiddenException("El usuario no tiene una tienda vinculada para consultar tiendas.");
    }

    return this.prisma.store.findMany({
      where: user.isRoot
        ? {}
        : {
            id: user.storeId as string
          },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: "asc"
      }
    });
  }
}
