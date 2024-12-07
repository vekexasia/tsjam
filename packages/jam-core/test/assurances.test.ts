import { describe, it, vi, expect } from "vitest";

import { verifyEA } from "@/verifySeal";
import {
  E_sub_int,
  HashCodec,
  JamCodec,
  ValidatorDataCodec,
  WorkReportCodec,
  codec_Ea,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
} from "@tsjam/codec";
import {
  Hash,
  Tau,
  EA_Extrinsic,
  WorkReport,
  RHO,
  Posterior,
  ValidatorData,
  JamState,
  Dagger,
} from "@tsjam/types";
import fs from "node:fs";
import { beforeEach } from "vitest";
import { TestOutputCodec, RHOCodec } from "@tsjam/codec/test/utils.js";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";

const mocks = vi.hoisted(() => {
  return {
    CORES: 2,
    NUMBER_OF_VALIDATORS: 1,
  };
});

vi.mock("@tsjam/constants", async (importOriginal) => {
  const toRet = {
    ...(await importOriginal<typeof import("@tsjam/constants")>()),
    ...mocks,
  };
  Object.defineProperty(toRet, "NUMBER_OF_VALIDATORS", {
    get() {
      return mocks.NUMBER_OF_VALIDATORS;
    },
  });
  Object.defineProperty(toRet, "CORES", {
    get() {
      return mocks.CORES;
    },
  });
  return toRet;
});

export const getCodecFixtureFile = (
  filename: string,
  kind: "tiny" | "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/assurances/${kind}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};
type TestState = { rho: RHO; p_kappa: ValidatorData[] };
describe("assurances", () => {
  const doTest = (filename: string, kind: "tiny" | "full") => {
    const stateCodec = createCodec<TestState>([
      ["rho", RHOCodec(CORES)],
      [
        "p_kappa",
        createSequenceCodec(
          NUMBER_OF_VALIDATORS,
          ValidatorDataCodec,
        ) as unknown as JamCodec<ValidatorData[]>,
      ],
    ]);

    const newTestCodec = createCodec<{
      input: { ea: EA_Extrinsic; slot: Tau; parent: Hash };
      output: { error?: 0 | 1 | 2 | 3 | 4 | 5; output?: WorkReport[] };
      preState: TestState;
      postState: TestState;
    }>([
      [
        "input",
        createCodec<{ ea: EA_Extrinsic; slot: Tau; parent: Hash }>([
          ["ea", codec_Ea],
          ["slot", E_sub_int<Tau>(4)],
          ["parent", HashCodec],
        ]),
      ],
      ["preState", stateCodec],
      [
        "output",
        TestOutputCodec<0 | 1 | 2 | 3 | 4 | 5, WorkReport[]>(
          createArrayLengthDiscriminator(WorkReportCodec),
        ),
      ],
      ["postState", stateCodec],
    ]);
    const decoded = newTestCodec.decode(
      getCodecFixtureFile(`${filename}.bin`, kind),
    );
    return verifyEA(
      decoded.value.input.ea,
      decoded.value.input.parent,
      decoded.value.input.slot,
      decoded.value.preState.p_kappa as Posterior<JamState["kappa"]>,
      decoded.value.preState.rho as Dagger<RHO>,
    );
  };
  describe("tiny", () => {
    beforeEach(() => {
      mocks.CORES = 2;
      mocks.NUMBER_OF_VALIDATORS = 6;
    });

    it("no_assurances-1", () => {
      expect(doTest("no_assurances-1", "tiny")).toBe(true);
    });
    it("some_assurances-1", () => {
      expect(doTest("some_assurances-1", "tiny")).toBe(true);
    });
  });
});
