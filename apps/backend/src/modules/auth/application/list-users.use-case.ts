import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { AuthenticatedUserPayload } from "../ports/auth-token.port";

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  execute(currentUser: AuthenticatedUserPayload) {
    return this.prisma.user.findMany({
      where: currentUser.isRoot
        ? undefined
        : {
            storeId: currentUser.storeId
          },
      orderBy: {
        username: "asc"
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        storeId: true,
        isRoot: true,
        mustChangePassword: true,
        isActive: true,
        store: {
          select: {
            id: true,
            name: true
          }
        },
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
  }
}
