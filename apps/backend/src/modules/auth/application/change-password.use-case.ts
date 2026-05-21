import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/prisma/prisma.service";
import { PASSWORD_HASHER_PORT, PasswordHasherPort } from "../ports/password-hasher.port";

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  userId: string;
  mustChangePassword: boolean;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER_PORT) private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    if (input.newPassword.length < 8) {
      throw new BadRequestException("La nueva contrasena debe tener al menos 8 caracteres.");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: input.userId
      },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user) {
      throw new NotFoundException("El usuario indicado no existe.");
    }

    const currentPasswordMatches = await this.passwordHasher.verify(input.currentPassword, user.passwordHash);

    if (!currentPasswordMatches) {
      throw new UnauthorizedException("La contrasena actual no es valida.");
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        passwordHash,
        mustChangePassword: false
      },
      select: {
        id: true,
        mustChangePassword: true
      }
    });

    return {
      userId: updatedUser.id,
      mustChangePassword: updatedUser.mustChangePassword
    };
  }
}
