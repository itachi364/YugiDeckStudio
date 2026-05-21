import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DecksModule } from "./modules/decks/decks.module";
import { StoresModule } from "./modules/stores/stores.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    StoresModule,
    DecksModule
  ]
})
export class AppModule {}
