import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    testTimeout: 120000, // 2 minutes for LLM-based tests
    sequence: {
      concurrent: false
    }
  },
  plugins: [tsconfigPaths()],
});
