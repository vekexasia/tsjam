import { defineWorkspace } from "vitest/config";
import path from "path";

export default defineWorkspace([
  {
    extends: path.join(__dirname, "vitest.config.mts"),
    test: {
      name: "jam-safrole",
    },
  },
]);
