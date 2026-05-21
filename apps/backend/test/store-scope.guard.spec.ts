import { BadRequestException } from "@nestjs/common";
import { StoreScopeGuard } from "../src/modules/auth/infrastructure/store-scope.guard";

describe("StoreScopeGuard", () => {
  const assertCanAccessStore = jest.fn();
  const guard = new StoreScopeGuard({
    assertCanAccessStore
  } as never);

  const context = (request: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request
      })
    }) as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates store scope from route params", () => {
    const request = {
      user: {
        sub: "user-id"
      },
      params: {
        storeId: "store-id"
      },
      body: {}
    };

    expect(guard.canActivate(context(request))).toBe(true);
    expect(assertCanAccessStore).toHaveBeenCalledWith(request.user, "store-id");
  });

  it("validates store scope from body when route param is absent", () => {
    const request = {
      user: {
        sub: "user-id"
      },
      params: {},
      body: {
        storeId: "store-id"
      }
    };

    expect(guard.canActivate(context(request))).toBe(true);
    expect(assertCanAccessStore).toHaveBeenCalledWith(request.user, "store-id");
  });

  it("rejects requests without store scope", () => {
    expect(
      () =>
        guard.canActivate(
          context({
            user: {
              sub: "user-id"
            },
            params: {},
            body: {}
          })
        )
    ).toThrow(BadRequestException);
  });
});
