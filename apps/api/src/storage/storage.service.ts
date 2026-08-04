import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

export type StorageStatus = "ok" | "degraded" | "disabled";

@Injectable()
export class StorageService {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private status: StorageStatus = "disabled";

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("S3_ENDPOINT");
    const bucket = this.config.get<string>("S3_BUCKET");
    const accessKey = this.config.get<string>("S3_ACCESS_KEY");
    const secretKey = this.config.get<string>("S3_SECRET_KEY");
    const region = this.config.get<string>("S3_REGION") ?? "us-east-1";

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      this.status = "disabled";
      return;
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
    this.status = "ok";
  }

  getStatus(): StorageStatus {
    return this.status;
  }

  async check(): Promise<StorageStatus> {
    if (!this.client || !this.bucket) {
      return this.status;
    }
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.status = "ok";
    } catch {
      this.status = "degraded";
    }
    return this.status;
  }

  /** Stub upload — returns a synthetic object key without requiring a live bucket. */
  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType = "application/octet-stream",
  ): Promise<{ key: string; bucket: string | null; stub: boolean }> {
    if (!this.client || !this.bucket) {
      return { key, bucket: null, stub: true };
    }
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: typeof body === "string" ? Buffer.from(body) : body,
          ContentType: contentType,
        }),
      );
      return { key, bucket: this.bucket, stub: false };
    } catch {
      return { key, bucket: this.bucket, stub: true };
    }
  }
}
