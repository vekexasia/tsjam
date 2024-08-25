import { defineWorkspace } from "vitest/config";
import codec from "./packages/jam-codec/vitest.workspace.ts";
import pvm from "./packages/jam-pvm/vitest.workspace.ts";
import safrole from "./packages/jam-safrole/vitest.workspace.ts";
export default defineWorkspace([...codec, ...pvm, ...safrole]);
