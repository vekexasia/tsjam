import { defineWorkspace } from "vitest/config";
import codec from "./packages/jam-codec/vitest.workspace.ts";
export default defineWorkspace([...codec]);
