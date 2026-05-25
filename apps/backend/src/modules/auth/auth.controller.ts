import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from "@nestjs/common";
import { AssignPermissionsToRoleUseCase } from "./application/assign-permissions-to-role.use-case";
import { AssignRolesToUserUseCase } from "./application/assign-roles-to-user.use-case";
import { ChangePasswordUseCase } from "./application/change-password.use-case";
import { ConfigureFirstStoreAdminUseCase } from "./application/configure-first-store-admin.use-case";
import { ConfigurePermissionsUseCase } from "./application/configure-permissions.use-case";
import { ConfigureRolesUseCase } from "./application/configure-roles.use-case";
import { InitializeRootUserUseCase } from "./application/initialize-root-user.use-case";
import { ListUsersUseCase } from "./application/list-users.use-case";
import { LoginUseCase } from "./application/login.use-case";
import { RegisterUserUseCase } from "./application/register-user.use-case";
import { SYSTEM_PERMISSIONS } from "./domain/system-permissions";
import { AssignPermissionsToRoleDto } from "./dto/assign-permissions-to-role.dto";
import { AssignRolesToUserDto } from "./dto/assign-roles-to-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ConfigureFirstStoreAdminDto } from "./dto/configure-first-store-admin.dto";
import { ConfigurePermissionDto } from "./dto/configure-permission.dto";
import { ConfigureRoleDto } from "./dto/configure-role.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { CurrentUser } from "./infrastructure/current-user.decorator";
import { JwtAuthGuard } from "./infrastructure/jwt-auth.guard";
import { PermissionGuard } from "./infrastructure/permission.guard";
import { RequirePermissions } from "./infrastructure/require-permissions.decorator";
import { RootOnlyGuard } from "./infrastructure/root-only.guard";
import { AuthenticatedUserPayload } from "./ports/auth-token.port";

@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly initializeRootUserUseCase: InitializeRootUserUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly configureFirstStoreAdminUseCase: ConfigureFirstStoreAdminUseCase,
    private readonly configureRolesUseCase: ConfigureRolesUseCase,
    private readonly configurePermissionsUseCase: ConfigurePermissionsUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly assignPermissionsToRoleUseCase: AssignPermissionsToRoleUseCase,
    private readonly assignRolesToUserUseCase: AssignRolesToUserUseCase
  ) {}

  @Post("root/initialize")
  initializeRootUser() {
    return this.initializeRootUserUseCase.execute();
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.loginUseCase.execute(body);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: AuthenticatedUserPayload, @Body() body: ChangePasswordDto) {
    return this.changePasswordUseCase.execute({
      userId: user.sub,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword
    });
  }

  @Post("register")
  register(@Body() body: RegisterUserDto) {
    return this.registerUserUseCase.execute(body);
  }

  @Post("root/store-admin")
  @UseGuards(JwtAuthGuard, RootOnlyGuard)
  configureFirstStoreAdmin(@Body() body: ConfigureFirstStoreAdminDto) {
    return this.configureFirstStoreAdminUseCase.execute(body);
  }

  @Get("users")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  listUsers(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.listUsersUseCase.execute(user);
  }

  @Get("roles")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  listRoles() {
    return this.configureRolesUseCase.list();
  }

  @Post("roles")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  createRole(@Body() body: ConfigureRoleDto) {
    return this.configureRolesUseCase.create(body);
  }

  @Put("roles/:roleId")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  updateRole(@Param("roleId", ParseUUIDPipe) roleId: string, @Body() body: ConfigureRoleDto) {
    return this.configureRolesUseCase.update({
      roleId,
      ...body
    });
  }

  @Put("roles/:roleId/permissions")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  assignPermissionsToRole(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Body() body: AssignPermissionsToRoleDto
  ) {
    return this.assignPermissionsToRoleUseCase.execute({
      roleId,
      permissionIds: body.permissionIds
    });
  }

  @Get("permissions")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  listPermissions() {
    return this.configurePermissionsUseCase.list();
  }

  @Post("permissions")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  createPermission(@Body() body: ConfigurePermissionDto) {
    return this.configurePermissionsUseCase.create(body);
  }

  @Put("permissions/:permissionId")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  updatePermission(@Param("permissionId", ParseUUIDPipe) permissionId: string, @Body() body: ConfigurePermissionDto) {
    return this.configurePermissionsUseCase.update({
      permissionId,
      ...body
    });
  }

  @Put("users/:userId/roles")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.SECURITY_MANAGE)
  assignRolesToUser(@Param("userId", ParseUUIDPipe) userId: string, @Body() body: AssignRolesToUserDto) {
    return this.assignRolesToUserUseCase.execute({
      userId,
      roleIds: body.roleIds
    });
  }
}
