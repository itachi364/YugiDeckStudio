import { Module } from "@nestjs/common";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { ImageCleanupService } from "./application/image-cleanup.service";
import { MaintenanceController } from "./maintenance.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceController],
  providers: [ImageCleanupService],
  exports: [ImageCleanupService]
})
export class MaintenanceModule {}
