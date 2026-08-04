import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CabinetryController } from "./cabinetry.controller";
import { CabinetryService } from "./cabinetry.service";

@Module({
  imports: [AuthModule],
  controllers: [CabinetryController],
  providers: [CabinetryService],
})
export class CabinetryModule {}
