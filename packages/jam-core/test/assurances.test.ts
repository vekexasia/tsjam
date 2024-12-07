import { describe, it, vi, expect } from "vitest";

import { verifyEA } from "@/verifySeal";
import {
  E_4_int,
  HashCodec,
  JamCodec,
  WorkReportCodec,
  codec_Ea,
  createArrayLengthDiscriminator,
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
import {
  TestOutputCodec,
  ValidatorsDataCodec,
  RHOCodec,
} from "@tsjam/codec/test/utils.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";

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
const testCodec: JamCodec<{
  input: { ea: EA_Extrinsic; slot: Tau; parent: Hash };
  output: { error?: 0 | 1 | 2 | 3 | 4 | 5; output?: WorkReport[] };
  preState: TestState;
  postState: TestState;
}> = {
  encode(value, bytes) {
    throw new Error("Not implemented");
  },
  decode(bytes) {
    let offset = 0;
    const ea = codec_Ea.decode(bytes);
    offset += ea.readBytes;
    const tau = E_4_int.decode(bytes.subarray(offset, offset + 4));
    offset += tau.readBytes;
    const parent = HashCodec.decode(bytes.subarray(offset, offset + 32));
    // state
    const rhoCodec = RHOCodec(mocks.CORES);
    const rho = rhoCodec.decode(bytes.subarray(offset));
    offset += rho.readBytes;
    const p_kappa = ValidatorsDataCodec(mocks.NUMBER_OF_VALIDATORS).decode(
      bytes.subarray(offset),
    );
    offset += p_kappa.readBytes;

    const outputCodec = TestOutputCodec<0 | 1 | 2 | 3 | 4 | 5, WorkReport>(
      createArrayLengthDiscriminator(WorkReportCodec),
    );
    const output = outputCodec.decode(bytes.subarray(offset));
    offset += output.readBytes;

    const postState_rho = rhoCodec.decode(bytes.subarray(offset));

    offset += postState_rho.readBytes;
    const postState_p_kappa = ValidatorsDataCodec(
      mocks.NUMBER_OF_VALIDATORS,
    ).decode(bytes.subarray(offset));
    offset += postState_p_kappa.readBytes;

    return {
      value: {
        input: { ea: ea.value, slot: <Tau>tau.value, parent: parent.value },
        output: output.value,
        preState: { rho: rho.value, p_kappa: p_kappa.value },
        postState: { rho: postState_rho, p_kappa: postState_p_kappa },
      },
      readBytes: offset,
    };
  },
  encodedSize(value) {
    return 0;
  },
};
describe("assurances", () => {
  const doTest = (filename: string, kind: "tiny" | "full") => {
    const decoded = testCodec.decode(
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

    /*
    it("no_assurances-1", () => {
      expect(doTest("no_assurances-1", "tiny")).toBe(true);
    });
    */
    it("some_assurances-1", () => {
      expect(doTest("some_assurances-1", "tiny")).toBe(true);
    });
  });
});
