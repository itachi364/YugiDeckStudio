import { Test } from "@nestjs/testing";
import { HealthController } from "../src/health/health.controller";

describe("HealthController", () => {
  it("returns service health", () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "yugideckstudio-backend"
    });
  });

  it("can be resolved by the Nest testing module", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController]
    }).compile();

    expect(moduleRef.get(HealthController)).toBeInstanceOf(HealthController);
  });
});
