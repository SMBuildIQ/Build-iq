import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "node:path";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { StorageModule } from "./storage/storage.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { ProjectsModule } from "./projects/projects.module";
import { ProposalsModule } from "./proposals/proposals.module";
import { PublicProposalsModule } from "./public-proposals/public-proposals.module";
import { ShopModule } from "./shop/shop.module";
import { OrdersModule } from "./orders/orders.module";
import { CabinetryModule } from "./cabinetry/cabinetry.module";
import { MaterialsModule } from "./materials/materials.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, "..", ".env"),
        join(process.cwd(), "apps", "api", ".env"),
        ".env",
      ],
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    HealthModule,
    ProjectsModule,
    ProposalsModule,
    PublicProposalsModule,
    ShopModule,
    OrdersModule,
    CabinetryModule,
    MaterialsModule,
  ],
})
export class AppModule {}
