import { defineConfig } from "vitest/config";
import { buildPoolOptions } from "./build/buildVitest";

export default defineConfig({
  optimizeDeps: {
    include: ["vitest > @vitest/expect > chai"],
  },

  test: {
    projects: [
      "./packages/jam-codec",
      "./packages/jam-core",
      "./packages/jam-fuzzer",
      "./packages/jam-fuzzer-target",
      "./packages/jam-pvm-wasm",
    ],

    poolOptions: buildPoolOptions(),
  },
});
