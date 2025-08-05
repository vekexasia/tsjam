import {
  createCodec,
  E_sub_int,
  createSequenceCodec,
  BaseJamCodecable,
  JamCodecable,
  codec,
  eSubIntCodec,
  eSubBigIntCodec,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  JamBlock,
  JamState,
  Posterior,
  Tau,
  ValidatorIndex,
  ValidatorStatistics,
} from "@tsjam/types";
import fs, { constants } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getCodecFixtureFile } from "./codec_utils";
import { ValidatorStatisticsImpl } from "@/classes/ValidatorStatisticsImpl";
import { ValidatorDataImpl } from "@/classes/ValidatorDataImpl";
import { JamBlockExtrinsicsImpl } from "@/classes/JamBlockExtrinsicsImpl";
import { JamStateImpl } from "@/classes/JamStateImpl";
import { toTagged } from "@tsjam/utils";
import { DisputesStateImpl } from "@/classes/DisputesStateImpl";
import { dummyDisputesState, dummyEntropy } from "./utils";

export const getFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/stf/statistics/full/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(ValidatorStatisticsImpl)
  validatorStatistics!: ValidatorStatisticsImpl;
  @eSubIntCodec(4)
  slot!: Tau;
  @codec(ValidatorDataImpl)
  p_kappa!: Posterior<JamStateImpl["kappa"]>;
}

@JamCodecable()
class TestInput extends BaseJamCodecable {
  @eSubIntCodec(4)
  p_tau!: Posterior<Tau>;

  @eSubIntCodec(2)
  authorIndex!: ValidatorIndex;

  @codec(JamBlockExtrinsicsImpl)
  extrinsics!: JamBlockExtrinsicsImpl;
}

@JamCodecable()
class TestCase extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;
  @codec(TestState)
  preState!: TestState;

  @codec(TestState)
  postState!: TestState;
}

describe("statistics", () => {
  const doTest = (filename: string) => {
    const { value: test } = TestCase.decode(
      getCodecFixtureFile(`${filename}.bin`),
    );
    const p_pi = test.preState.validatorStatistics.toPosterior({
      extrinsics: test.input.extrinsics,
      authorIndex: test.input.authorIndex,
      p_tau: test.input.p_tau,
      tau: test.preState.slot,
      p_kappa: test.preState.p_kappa,
      p_lambda: toTagged(test.preState.p_kappa),
      p_disputes: toTagged(dummyDisputesState()),
      p_entropy: dummyEntropy(),
    });

    expect(p_pi.previous.toJSON(), "previous").deep.eq(
      test.postState.validatorStatistics.previous.toJSON(),
    );
    expect(p_pi.accumulator.toJSON(), "accumulator").deep.eq(
      test.postState.validatorStatistics.accumulator.toJSON(),
    );
  };
  describe("full", () => {
    it("stats_with_empty_extrinsic-1", () => {
      doTest("stats_with_empty_extrinsic-1");
    });
    it("stats_with_epoch_change", () => {
      doTest("stats_with_epoch_change-1");
    });
    it("stats_with_some_extrinsic", () => {
      doTest("stats_with_some_extrinsic-1");
    });
  });
});
