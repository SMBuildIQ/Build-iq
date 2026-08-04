import { Module } from "@nestjs/common";
import { PublicProposalsController } from "./public-proposals.controller";
import { PublicProposalsService } from "./public-proposals.service";

@Module({
  controllers: [PublicProposalsController],
  providers: [PublicProposalsService],
})
export class PublicProposalsModule {}
