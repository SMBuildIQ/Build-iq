import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, RequirePermissions, type AuthUser } from "../auth/auth.decorators";
import { CabinetryService } from "./cabinetry.service";

@Controller("cabinetry")
@UseGuards(JwtAuthGuard)
export class CabinetryController {
  constructor(private readonly cabinetry: CabinetryService) {}

  @Get("opportunities")
  @RequirePermissions("cabinetry:view")
  list(@CurrentUser() user: AuthUser) {
    return this.cabinetry.list(user);
  }

  @Post("opportunities")
  @RequirePermissions("cabinetry:opportunity:write")
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.cabinetry.create(user, body);
  }
}
