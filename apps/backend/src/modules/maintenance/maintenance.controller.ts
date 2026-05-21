import { Controller, Post } from "@nestjs/common";
import { ImageCleanupService } from "./application/image-cleanup.service";

@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly imageCleanupService: ImageCleanupService) {}

  @Post("image-cleanup/run")
  runImageCleanup() {
    return this.imageCleanupService.run();
  }
}
