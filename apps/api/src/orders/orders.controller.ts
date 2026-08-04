import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, RequirePermissions, type AuthUser } from "../auth/auth.decorators";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequirePermissions("order:view")
  list(@CurrentUser() user: AuthUser) {
    return this.orders.list(user);
  }

  @Get(":id")
  @RequirePermissions("order:view")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.orders.get(user, id);
  }
}
