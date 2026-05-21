import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { SYSTEM_ROLES } from "../domain/system-roles";
import { PASSWORD_HASHER_PORT, PasswordHasherPort } from "../ports/password-hasher.port";

export interface RegisterUserInput {
  storeId: string;
  username: string;
  password: string;
  displayName: string;
  email?: string;
}

export interface RegisterUserResult {
  userId: string;
  username: string;
  storeId: string;
  roles: string[];
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserResult> {
    this.validateInput(input);

    const [store, operatorRole] = await Promise.all([
      this.prisma.store.findUnique({
        where: {
          id: input.storeId
        },
        select: {
          id: true
        }
      }),
      this.prisma.role.upsert({
        where: {
          name: SYSTEM_ROLES.OPERATOR
        },
        update: {
          isSystemRole: true
        },
        create: {
          name: SYSTEM_ROLES.OPERATOR,
          description: "Operador de tienda.",
          isSystemRole: true
        },
        select: {
          id: true,
          name: true
        }
      })
    ]);

    if (!store) {
      throw new NotFoundException("La tienda indicada no existe.");
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: input.username.trim() }, ...(input.email ? [{ email: input.email.trim() }] : [])]
      },
      select: {
        id: true
      }
    });

    if (existingUser) {
      throw new ConflictException("Ya existe un usuario con el username o email indicado.");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        storeId: input.storeId,
        username: input.username.trim(),
        email: input.email?.trim(),
        passwordHash,
        displayName: input.displayName.trim(),
        isRoot: false,
        mustChangePassword: false,
        isActive: true,
        userRoles: {
          create: {
            roleId: operatorRole.id
          }
        }
      },
      select: {
        id: true,
        username: true,
        storeId: true
      }
    });

    return {
      userId: user.id,
      username: user.username,
      storeId: user.storeId ?? input.storeId,
      roles: [operatorRole.name]
    };
  }

  private validateInput(input: RegisterUserInput): void {
    if (input.password.length < 8) {
      throw new BadRequestException("La contrasena debe tener al menos 8 caracteres.");
    }

    const requiredFields = [
      ["storeId", input.storeId],
      ["username", input.username],
      ["displayName", input.displayName]
    ];
    const missingFields = requiredFields.filter(([, value]) => !value?.trim());

    if (missingFields.length > 0) {
      throw new BadRequestException(`Campos obligatorios faltantes: ${missingFields.map(([field]) => field).join(", ")}.`);
    }
  }
}
