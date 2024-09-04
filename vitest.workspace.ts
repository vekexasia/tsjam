import { defineWorkspace } from "vitest/config";
import codec from "./packages/jam-codec/vitest.workspace";
import pvm from "./packages/jam-pvm/vitest.workspace";
import work from "./packages/jam-work/vitest.workspace";
import recenthistory from "./packages/jam-recenthistory/vitest.workspace";
import safrole from "./packages/jam-safrole/vitest.workspace";
export default defineWorkspace([
  ...codec,
  ...pvm,
  ...safrole,
  ...work,
  ...recenthistory,
]);
