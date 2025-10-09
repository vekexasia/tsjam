import { getConstantsMode } from "@tsjam/constants";
import { describe } from "vitest";
import packageJSON from "../../package.json";
import { buildTracesTests } from "./traces-common";

describe.skipIf(getConstantsMode() === "full")("Safrole Traces", () => {
  buildTracesTests("safrole");
});
