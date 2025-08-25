import { defineConfig } from "vitest/config";
import { buildPoolOptions } from "./build/buildVitest";

export default defineConfig({
  optimizeDeps: {
    include: ["vitest > @vitest/expect > chai"],
  },

  test: {
    projects: ["./packages/jam-core"],

    poolOptions: buildPoolOptions(),
  },
});
