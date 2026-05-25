import { ListUsersUseCase } from "../src/modules/auth/application/list-users.use-case";

describe("ListUsersUseCase", () => {
  const findMany = jest.fn();
  const useCase = new ListUsersUseCase({
    user: {
      findMany
    }
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("lists all users for root", async () => {
    await useCase.execute({
      sub: "root-id",
      username: "root",
      storeId: null,
      isRoot: true,
      mustChangePassword: false,
      roles: ["root"]
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it("limits non-root users to their store", async () => {
    await useCase.execute({
      sub: "admin-id",
      username: "admin",
      storeId: "store-id",
      isRoot: false,
      mustChangePassword: false,
      roles: ["store_admin"]
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { storeId: "store-id" } }));
  });
});
