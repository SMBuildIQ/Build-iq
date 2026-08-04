import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser, RequirePermissions, type AuthUser } from "./auth.decorators";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Post("login")
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthUser) {
    return this.auth.logout(user);
  }

  @Delete("account")
  @UseGuards(JwtAuthGuard)
  @RequirePermissions("account:delete")
  deleteAccount(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.auth.deleteAccount(user, body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }
}
