import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { PublicProposalsService } from "./public-proposals.service";

@Controller("public/proposals")
export class PublicProposalsController {
  constructor(private readonly publicProposals: PublicProposalsService) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.publicProposals.get(token);
  }

  @Post(":token")
  accept(@Param("token") token: string, @Body() body: unknown, @Req() req: Request) {
    return this.publicProposals.accept(token, body, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}
