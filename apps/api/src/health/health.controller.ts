import { Controller, Get } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { StorageService } from "../storage/storage.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async health() {
    const [redis, storage] = await Promise.all([this.redis.ping(), this.storage.check()]);
    return {
      ok: true,
      redis,
      storage,
    };
  }
}
