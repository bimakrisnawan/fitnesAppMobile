import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tests set their own webhook token so they never depend on (or touch) secrets in .env.
    env: { NODE_ENV: "test", MAYAR_WEBHOOK_TOKEN: "test-webhook-token-0123456789abcdef" },
    // Tests share one database; run files sequentially.
    fileParallelism: false,
  },
});
