import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { StoreAccessPolicyService } from "../src/modules/auth/application/store-access-policy.service";

describe("StoreAccessPolicyService", () => {
  const service = new StoreAccessPolicyService();

  it("allows root users to access any store", () => {
    expect(() =>
      service.assertCanAccessStore(
        {
          sub: "root-id",
          username: "root",
          storeId: null,
          isRoot: true,
          mustChangePassword: false,
          roles: ["root"]
        },
        "store-2"
      )
    ).not.toThrow();
  });

  it("allows non-root users to access their own store", () => {
    expect(() =>
      service.assertCanAccessStore(
        {
          sub: "user-id",
          username: "operator",
          storeId: "store-1",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        },
        "store-1"
      )
    ).not.toThrow();
  });

  it("blocks access to another store", () => {
    expect(() =>
      service.assertCanAccessStore(
        {
          sub: "user-id",
          username: "operator",
          storeId: "store-1",
          isRoot: false,
          mustChangePassword: false,
          roles: ["operator"]
        },
        "store-2"
      )
    ).toThrow(ForbiddenException);
  });

  it("requires an authenticated user", () => {
    expect(() => service.assertCanAccessStore(undefined, "store-1")).toThrow(UnauthorizedException);
  });
});
