import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/auth.decorators";
import { MATERIAL_LIBRARY_CATEGORIES } from "@buildiq/types";
import { MATERIAL_CATALOG } from "./catalog";

@Controller("materials")
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  @Get("catalog")
  @RequirePermissions("project:read")
  catalog() {
    return {
      categories: MATERIAL_LIBRARY_CATEGORIES,
      items: MATERIAL_CATALOG,
    };
  }
}
