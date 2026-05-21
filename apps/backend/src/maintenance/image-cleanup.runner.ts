import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ImageCleanupService } from "../modules/maintenance/application/image-cleanup.service";

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"]
  });

  try {
    const imageCleanupService = app.get(ImageCleanupService);
    const result = await imageCleanupService.run();
    console.log(JSON.stringify(result));
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
