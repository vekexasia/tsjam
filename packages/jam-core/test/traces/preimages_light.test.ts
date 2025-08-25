import { getConstantsMode } from "@tsjam/constants";
import { describe } from "vitest";
import packageJSON from "../../package.json";
import { buildTracesTests } from "./traces-common";

describe.skipIf(
  packageJSON["jam:protocolVersion"] === "0.7.1" ||
    getConstantsMode() === "full",
)("Preimages_ligtht Traces", () => {
  buildTracesTests("preimages_light");
});
