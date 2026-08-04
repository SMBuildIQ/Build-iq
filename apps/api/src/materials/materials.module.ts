import { Module } from "@nestjs/common";
import { MaterialsController } from "./materials.controller";

@Module({
  controllers: [MaterialsController],
})
export class MaterialsModule {}
