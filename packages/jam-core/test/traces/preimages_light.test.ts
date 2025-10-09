import { getConstantsMode } from "@tsjam/constants";
import { describe } from "vitest";
import { buildTracesTests } from "./traces-common";

describe.skipIf(getConstantsMode() === "full")(
  "Preimages_ligtht Traces",
  () => {
    buildTracesTests("preimages_light");
  },
);
