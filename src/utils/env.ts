import { z } from "zod";

const EnvSchema = z.object({
  JWT_SECRET: z.string().min(1),
  APP_PASSWORD: z.string().min(1),
  MONGO_URI: z.string().url(),
  DISCORD_WEBHOOK_URL: z.string().url(),

  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET_NAME: z.string(),
  CLOUDFRONT_DOMAIN: z.string(),
});

export const ENV = EnvSchema.parse(process.env);

export type Env = z.infer<typeof EnvSchema>;
