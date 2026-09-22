import type { Config } from "drizzle-kit";

export default {
  schema: ["./src/features/chat/storage/schema.ts", "./src/features/purchases/storage/schema.ts"],
  out: "./drizzle/app",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
