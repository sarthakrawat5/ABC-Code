import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const missing = parsed.error.issues.map(issue => issue.path.join(".")).join(", ");
  throw new Error(`Invalid server environment. Check: ${missing}`);
}

export const config = {
  port: parsed.data.PORT,
  appOrigin: parsed.data.APP_ORIGIN,
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY
};
