import { describe, it, vi, expect } from "vitest";

import { verifyEA } from "@/verifySeal";
import {
  E_sub_int,
  JamCodec,
  ValidatorDataCodec,
  WorkReportCodec,
  codec_Ea,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  Optional,
  create32BCodec,
} from "@tsjam/codec";
import {
  Tau,
  EA_Extrinsic,
  WorkReport,
  RHO,
  Posterior,
  ValidatorData,
  JamState,
  Dagger,
  Validated,
  HeaderHash,
} from "@tsjam/types";
import fs from "node:fs";
import { beforeEach } from "vitest";
import { TestOutputCodec } from "@tsjam/codec/test/utils.js";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { RHO2DoubleDagger } from "@tsjam/transitions";
import { toPosterior } from "@tsjam/utils";
import { availableReports } from "@/accumulate";

const mocks = vi.hoisted(() => {
  return {
    CORES: 341,
    NUMBER_OF_VALIDATORS: 1023,
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

const RHOCodec = (cores: number): JamCodec<RHO> => {
  const opt = new Optional(
    createCodec<{ workReport: WorkReport; reportTime: Tau }>([
      ["workReport", WorkReportCodec],
      ["reportTime", E_sub_int<Tau>(4)],
    ]),
  );
  const toRet: JamCodec<RHO> = {
    encode(value, bytes) {
      let offset = 0;
      for (let i = 0; i < cores; i++) {
        offset += opt.encode(value[i], bytes.subarray(offset));
      }
      return offset;
    },
    decode(bytes) {
      const toRet = [] as unknown as RHO;
      let offset = 0;
      for (let i = 0; i < cores; i++) {
        const { value, readBytes } = opt.decode(bytes.subarray(offset));
        offset += readBytes;
        toRet.push(value);
      }
      return { value: toRet, readBytes: offset };
    },
    encodedSize(value) {
      let size = 0;
      for (let i = 0; i < cores; i++) {
        size += opt.encodedSize(value[i]);
      }
      return size;
    },
  };
  return toRet;
};
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
      input: { ea: EA_Extrinsic; slot: Tau; parent: HeaderHash };
      output: { error?: 0 | 1 | 2 | 3 | 4 | 5; output?: WorkReport[] };
      preState: TestState;
      postState: TestState;
    }>([
      [
        "input",
        createCodec<{ ea: EA_Extrinsic; slot: Tau; parent: HeaderHash }>([
          ["ea", codec_Ea],
          ["slot", E_sub_int<Tau>(4)],
          ["parent", create32BCodec<HeaderHash>()],
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
    expect(decoded.value.preState.p_kappa).deep.eq([
      ...decoded.value.postState.p_kappa,
    ]);
    const eaVerified = verifyEA(
      decoded.value.input.ea,
      decoded.value.input.parent,
      // decoded.value.input.slot,
      decoded.value.preState.p_kappa as Posterior<JamState["kappa"]>,
      decoded.value.preState.rho as Dagger<RHO>,
    );
    const shouldBeVerified = typeof decoded.value.output.error === "undefined";

    expect(eaVerified).eq(shouldBeVerified);
    if (!shouldBeVerified) {
      return;
    }
    const [, dd_rho] = RHO2DoubleDagger(
      {
        rho: decoded.value.preState.rho,
        p_tau: toPosterior(decoded.value.input.slot),
        availableReports: availableReports(
          decoded.value.input.ea as Validated<EA_Extrinsic>,
          decoded.value.preState.rho as Dagger<RHO>,
        ),
      },
      decoded.value.preState.rho as Dagger<RHO>,
    ).safeRet();
    expect(dd_rho, "dd_rho").deep.eq(decoded.value.postState.rho);
    return true;
  };
  const set = "tiny" as "tiny" | "full";
  beforeEach(() => {
    if (set === "tiny") {
      mocks.CORES = 2;
      mocks.NUMBER_OF_VALIDATORS = 6;
    }
  });

  it("no_assurances-1", () => {
    doTest("no_assurances-1", set);
  });

  it("some_assurances-1", () => {
    doTest("some_assurances-1", set);
  });

  it("no_assurances_with_stale_report-1", () => {
    doTest("no_assurances_with_stale_report-1", set);
  });

  it("assurances_with_bad_signature-1", () => {
    doTest("assurances_with_bad_signature-1", set);
  });

  it("assurances_with_bad_validator_index-1", () => {
    doTest("assurances_with_bad_validator_index-1", set);
  });

  it("assurance_for_not_engaged_core-1", () => {
    doTest("assurance_for_not_engaged_core-1", set);
  });

  it("assurance_with_bad_attestation_parent-1", () => {
    doTest("assurance_with_bad_attestation_parent-1", set);
  });

  it("assurances_for_stale_report-1", () => {
    doTest("assurances_for_stale_report-1", set);
  });

  it("assurers_not_sorted_or_unique-1", () => {
    doTest("assurers_not_sorted_or_unique-1", set);
  });

  it("assurers_not_sorted_or_unique-2", () => {
    doTest("assurers_not_sorted_or_unique-2", set);
  });
});
