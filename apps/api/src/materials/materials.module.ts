import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MaterialsController } from "./materials.controller";

@Module({
  imports: [AuthModule],
  controllers: [MaterialsController],
})
export class MaterialsModule {}
