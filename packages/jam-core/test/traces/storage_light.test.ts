import { getConstantsMode } from "@tsjam/constants";
import { describe } from "vitest";
import { buildTracesTests } from "./traces-common";

describe.skipIf(getConstantsMode() === "full")("Storage_Light Traces", () => {
  buildTracesTests("storage_light");
});
