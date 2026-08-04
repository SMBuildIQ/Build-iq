import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./app.module";

/** Prefer apps/api/.env so root soft-launch SQLite DATABASE_URL is not picked up. */
function loadApiEnv() {
  const candidates = [
    join(__dirname, "..", ".env"),
    join(process.cwd(), "apps", "api", ".env"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadEnv({ path, override: true });
      return;
    }
  }
  // Fall back to process cwd .env without overriding existing vars.
  loadEnv();
}

async function bootstrap() {
  loadApiEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`BuildIQ API listening on :${port}`);
}

bootstrap();
