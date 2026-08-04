import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, RequirePermissions, type AuthUser } from "../auth/auth.decorators";
import { ProposalsService } from "./proposals.service";

@Controller("proposals")
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Get()
  @RequirePermissions("proposal:view")
  list(@CurrentUser() user: AuthUser) {
    return this.proposals.list(user);
  }

  @Post()
  @RequirePermissions("proposal:write")
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.proposals.create(user, body);
  }

  @Get(":id")
  @RequirePermissions("proposal:view")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.proposals.get(user, id);
  }

  @Patch(":id")
  @RequirePermissions("proposal:write")
  patch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.proposals.patch(user, id, body);
  }

  @Post(":id/send")
  @RequirePermissions("proposal:send")
  send(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: unknown) {
    return this.proposals.send(user, id, body);
  }

  @Get(":id/pdf")
  @RequirePermissions("proposal:view")
  pdf(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.proposals.pdf(user, id);
  }
}
