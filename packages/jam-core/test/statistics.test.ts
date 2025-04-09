/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, vi, expect, beforeAll, afterAll } from "vitest";
import {
  E_sub_int,
  codec_Ed,
  codec_Eg,
  codec_Ep,
  ValidatorDataCodec,
  codec_Ea,
  createCodec,
  createSequenceCodec,
  codec_Et,
  StatisticsCodec,
} from "@tsjam/codec";
import {
  Tau,
  Posterior,
  JamState,
  ValidatorIndex,
  JamBlock,
  JamStatistics,
  Validated,
  EA_Extrinsic,
  Dagger,
  RHO,
} from "@tsjam/types";
import fs from "node:fs";
import * as constants from "@tsjam/constants";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { logCodec } from "@tsjam/codec/test/utils.js";
import {
  _w,
  coreStatisticsSTF,
  serviceStatisticsSTF,
  validatorStatisticsToPosterior,
} from "@tsjam/transitions";
import { availableReports } from "@/accumulate";

export const getCodecFixtureFile = (
  filename: string,
  kind: "tiny" | "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/statistics/${kind}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

type TestState = {
  pi: JamStatistics;
  tau: Tau;
  p_kappa: Posterior<JamState["kappa"]>;
};
describe("statistics", () => {
  const doTest = (filename: string, kind: "tiny" | "full") => {
    const innerNUMOFVAL = <typeof NUMBER_OF_VALIDATORS>(
      (kind == "tiny" ? 6 : 1023)
    );
    const cores = <typeof CORES>(kind == "tiny" ? 2 : 341);
    const stateCodec = createCodec<TestState>([
      ["pi", StatisticsCodec(innerNUMOFVAL, cores)],
      logCodec(["tau", E_sub_int<Tau>(4)]),
      [
        "p_kappa",
        createSequenceCodec<Posterior<JamState["kappa"]>>(
          innerNUMOFVAL,
          ValidatorDataCodec,
        ),
      ],
    ]);

    const newTestCodec = createCodec<{
      input: {
        slot: Tau;
        authorIndex: ValidatorIndex;
        extrinsic: JamBlock["extrinsics"];
      };
      preState: TestState;
      postState: TestState;
    }>([
      [
        "input",
        createCodec<{
          slot: Tau;
          authorIndex: ValidatorIndex;
          extrinsic: JamBlock["extrinsics"];
        }>([
          ["slot", E_sub_int<Tau>(4)],
          ["authorIndex", E_sub_int<ValidatorIndex>(2)],
          [
            "extrinsic",
            createCodec<JamBlock["extrinsics"]>([
              ["tickets", codec_Et],
              ["preimages", codec_Ep],
              ["reportGuarantees", codec_Eg],
              ["assurances", codec_Ea],
              ["disputes", codec_Ed],
            ]),
          ],
        ]),
      ],
      ["preState", stateCodec],
      ["postState", stateCodec],
    ]);

    const decoded = newTestCodec.decode(
      getCodecFixtureFile(`${filename}.bin`, kind),
    );

    console.log(decoded.value.preState.pi.services);
    const [, posterior_validators] = validatorStatisticsToPosterior(
      {
        extrinsics: decoded.value.input.extrinsic,
        authorIndex: decoded.value.input.authorIndex,
        p_tau: decoded.value.input.slot,
        reporters: new Set(
          decoded.value.input.extrinsic.reportGuarantees
            .map((rg) => rg.credential)
            .flat()
            .map((c) => decoded.value.preState.p_kappa[c.validatorIndex])
            .map((v) => v.ed25519.bigint),
        ),
        curTau: decoded.value.preState.tau,
        p_kappa: decoded.value.preState.p_kappa,
      },
      decoded.value.preState.pi.validators,
    ).safeRet();
    expect(posterior_validators[0], "pi[0]").deep.eq(
      decoded.value.postState.pi.validators[0],
    );
    expect(posterior_validators[1], "pi[1]").deep.eq(
      decoded.value.postState.pi.validators[1],
    );

    const guaranteedReports = _w(
      decoded.value.input.extrinsic.reportGuarantees,
    );
    const [, p_cores] = coreStatisticsSTF(
      {
        availableReports: availableReports(
          <Validated<EA_Extrinsic>>decoded.value.input.extrinsic.assurances,
          <Dagger<RHO>>new Array(cores).fill(undefined),
        ),
        guaranteedReports,
        assurances: decoded.value.input.extrinsic.assurances,
      },
      decoded.value.preState.pi.cores,
    ).safeRet();
    expect(p_cores).deep.eq(decoded.value.postState.pi.cores);

    console.log({ guaranteedReports });
    const [, p_services] = serviceStatisticsSTF(
      {
        guaranteedReports,
        preimages: decoded.value.input.extrinsic.preimages,
        transferStatistics: new Map(),
        accumulationStatistics: new Map(),
      },
      decoded.value.preState.pi.services,
    ).safeRet();
    console.log(p_services);
    expect(p_services).deep.eq(decoded.value.postState.pi.services);
  };
  describe.skip("tiny", () => {
    beforeAll(() => {
      vi.spyOn(constants, "EPOCH_LENGTH", "get").mockReturnValue(<any>12);
      vi.spyOn(constants, "NUMBER_OF_VALIDATORS", "get").mockReturnValue(
        <any>6,
      );
      vi.spyOn(constants, "CORES", "get").mockReturnValue(<any>2);
    });
    afterAll(() => {
      vi.restoreAllMocks();
    });

    it("stats_with_empty_extrinsic-1", () => {
      doTest("stats_with_empty_extrinsic-1", "tiny");
    });
    it("stats_with_epoch_change", () => {
      doTest("stats_with_epoch_change-1", "tiny");
    });
    it("stats_with_some_extrinsic", () => {
      doTest("stats_with_some_extrinsic-1", "tiny");
    });
  });
  describe("full", () => {
    it("stats_with_empty_extrinsic-1", () => {
      doTest("stats_with_empty_extrinsic-1", "full");
    });
    it("stats_with_epoch_change", () => {
      doTest("stats_with_epoch_change-1", "full");
    });
    it("stats_with_some_extrinsic", () => {
      doTest("stats_with_some_extrinsic-1", "full");
    });
  });
});
