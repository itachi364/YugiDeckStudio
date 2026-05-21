import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUserPayload } from "../ports/auth-token.port";
import { AuthenticatedRequest } from "./jwt-auth.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as AuthenticatedUserPayload;
  }
);
