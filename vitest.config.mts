import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The "@/..." imports, read from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside a React Server environment; tests run plain Node.
      "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests stub fetch, so this address is never contacted; it only has to be set.
    env: { API_BASE_URL: "http://api.test" },
  },
});
