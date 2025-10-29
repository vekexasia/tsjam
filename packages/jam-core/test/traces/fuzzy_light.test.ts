import { getConstantsMode } from "@tsjam/constants";
import { describe } from "vitest";
import { buildTracesTests } from "./traces-common";

describe.skipIf(getConstantsMode() === "full")("Fuzzy Light Traces", () => {
  buildTracesTests("fuzzy_light");
});
