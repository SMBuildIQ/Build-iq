import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, RequirePermissions, type AuthUser } from "../auth/auth.decorators";
import { ShopService } from "./shop.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shop: ShopService) {}

  @Get("shop/packages")
  @RequirePermissions("shop:browse")
  packages() {
    return this.shop.packages();
  }

  @Get("cart")
  @RequirePermissions("cart:manage")
  getCart(@CurrentUser() user: AuthUser) {
    return this.shop.getCart(user);
  }

  @Post("cart")
  @RequirePermissions("cart:manage")
  addToCart(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.shop.addToCart(user, body);
  }

  @Post("checkout")
  @RequirePermissions("order:place")
  checkout(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.shop.checkout(user, body ?? {});
  }
}
