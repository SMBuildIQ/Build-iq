import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@buildiq/prisma-client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      // Allow boot without a live DB for typecheck/dev scaffolding; queries will fail until connected.
      console.warn("[Prisma] connect failed — API will error on DB routes until DATABASE_URL is reachable", err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
