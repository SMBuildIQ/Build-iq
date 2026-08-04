import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export type RedisStatus = "ok" | "degraded" | "disabled";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private status: RedisStatus = "disabled";

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("REDIS_URL");
    if (!url) {
      this.status = "disabled";
      return;
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      });
      this.client.on("error", () => {
        this.status = "degraded";
      });
      this.client.on("ready", () => {
        this.status = "ok";
      });
      void this.client.connect().catch(() => {
        this.status = "degraded";
      });
    } catch {
      this.status = "degraded";
      this.client = null;
    }
  }

  getStatus(): RedisStatus {
    return this.status;
  }

  getClient(): Redis | null {
    return this.client;
  }

  async ping(): Promise<RedisStatus> {
    if (!this.client) return this.status;
    try {
      const pong = await this.client.ping();
      this.status = pong === "PONG" ? "ok" : "degraded";
    } catch {
      this.status = "degraded";
    }
    return this.status;
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }
}
