import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AssignPermissionsToRoleUseCase } from "./application/assign-permissions-to-role.use-case";
import { AssignRolesToUserUseCase } from "./application/assign-roles-to-user.use-case";
import { ChangePasswordUseCase } from "./application/change-password.use-case";
import { ConfigureFirstStoreAdminUseCase } from "./application/configure-first-store-admin.use-case";
import { ConfigurePermissionsUseCase } from "./application/configure-permissions.use-case";
import { ConfigureRolesUseCase } from "./application/configure-roles.use-case";
import { InitializeRootUserUseCase } from "./application/initialize-root-user.use-case";
import { LoginUseCase } from "./application/login.use-case";
import { RegisterUserUseCase } from "./application/register-user.use-case";
import { StoreAccessPolicyService } from "./application/store-access-policy.service";
import { AuthController } from "./auth.controller";
import { BcryptPasswordHasherAdapter } from "./infrastructure/bcrypt-password-hasher.adapter";
import { DeckScopeGuard } from "./infrastructure/deck-scope.guard";
import { JwtAuthGuard } from "./infrastructure/jwt-auth.guard";
import { LocalJwtAuthTokenAdapter } from "./infrastructure/local-jwt-auth-token.adapter";
import { PermissionGuard } from "./infrastructure/permission.guard";
import { RootOnlyGuard } from "./infrastructure/root-only.guard";
import { StoreScopeGuard } from "./infrastructure/store-scope.guard";
import { AUTH_TOKEN_PORT } from "./ports/auth-token.port";
import { PASSWORD_HASHER_PORT } from "./ports/password-hasher.port";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    InitializeRootUserUseCase,
    LoginUseCase,
    ChangePasswordUseCase,
    RegisterUserUseCase,
    ConfigureFirstStoreAdminUseCase,
    ConfigureRolesUseCase,
    ConfigurePermissionsUseCase,
    AssignPermissionsToRoleUseCase,
    AssignRolesToUserUseCase,
    StoreAccessPolicyService,
    JwtAuthGuard,
    RootOnlyGuard,
    PermissionGuard,
    StoreScopeGuard,
    DeckScopeGuard,
    {
      provide: PASSWORD_HASHER_PORT,
      useClass: BcryptPasswordHasherAdapter
    },
    {
      provide: AUTH_TOKEN_PORT,
      useClass: LocalJwtAuthTokenAdapter
    }
  ],
  exports: [
    AUTH_TOKEN_PORT,
    PASSWORD_HASHER_PORT,
    JwtAuthGuard,
    RootOnlyGuard,
    PermissionGuard,
    StoreScopeGuard,
    DeckScopeGuard,
    StoreAccessPolicyService
  ]
})
export class AuthModule {}
