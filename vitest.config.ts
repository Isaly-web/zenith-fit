import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts on purpose: that file wraps the TanStack Start / Nitro build
// plugins, which tests do not need.
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
