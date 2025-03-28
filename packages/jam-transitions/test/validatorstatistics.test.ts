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
  ValidatorStatisticsCodec,
  codec_Et,
  StatisticsCodec,
} from "@tsjam/codec";
import {
  Tau,
  Posterior,
  JamState,
  ValidatorStatistics,
  ValidatorIndex,
  JamBlock,
  JamStatistics,
} from "@tsjam/types";
import fs from "node:fs";
import * as constants from "@tsjam/constants";
import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { validatorStatisticsToPosterior } from "@/validatorStatistics";
import { logCodec } from "@tsjam/codec/test/utils.js";

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
      logCodec(["pi", StatisticsCodec(innerNUMOFVAL, cores)], (s) => Statistcs),
      ["tau", E_sub_int<Tau>(4)],
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
    const [, posterior_pi] = validatorStatisticsToPosterior(
      {
        extrinsics: decoded.value.input.extrinsic,
        authorIndex: decoded.value.input.authorIndex,
        p_tau: decoded.value.input.slot,
        reporters: new Set(
          decoded.value.input.extrinsic.reportGuarantees
            .map((rg) => rg.credential)
            .flat()
            .map((c) => decoded.value.preState.p_kappa[c.validatorIndex])
            .map((v) => v.ed25519),
        ),
        curTau: decoded.value.preState.tau,
        p_kappa: decoded.value.preState.p_kappa,
      },
      decoded.value.preState.pi,
    ).safeRet();
    expect(posterior_pi[0], "pi[0]").deep.eq(decoded.value.postState.pi[0]);
    expect(posterior_pi[1], "pi[1]").deep.eq(decoded.value.postState.pi[1]);
  };
  describe("tiny", () => {
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
