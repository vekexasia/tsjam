import { JamBlockExtrinsicsImpl } from "@/impls/jam-block-extrinsics-impl";
import { JamStateImpl } from "@/impls/jam-state-impl";
import { KappaImpl } from "@/impls/kappa-impl";
import { LambdaImpl } from "@/impls/lambda-impl";
import { SlotImpl, type TauImpl } from "@/impls/slot-impl";
import { ValidatorStatisticsImpl } from "@/impls/validator-statistics-impl";
import {
  BaseJamCodecable,
  JamCodecable,
  codec,
  eSubIntCodec,
} from "@tsjam/codec";
import { getConstantsMode } from "@tsjam/constants";
import type { Posterior, Validated, ValidatorIndex } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { dummyDisputesState, dummyEntropy } from "../utils";

export const getFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../../jamtestvectors/stf/statistics/${getConstantsMode()}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(ValidatorStatisticsImpl)
  validatorStatistics!: ValidatorStatisticsImpl;
  @codec(SlotImpl)
  slot!: TauImpl;
  @codec(KappaImpl)
  p_kappa!: Posterior<JamStateImpl["kappa"]>;
}

@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(SlotImpl)
  p_tau!: Validated<Posterior<TauImpl>>;

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
    const { value: test } = TestCase.decode(getFixtureFile(`${filename}.bin`));
    const p_pi = test.preState.validatorStatistics.toPosterior({
      extrinsics: test.input.extrinsics,
      authorIndex: test.input.authorIndex,
      p_tau: test.input.p_tau,
      tau: test.preState.slot,
      p_kappa: test.preState.p_kappa,
      p_lambda: toPosterior(
        <JamStateImpl["lambda"]>(
          LambdaImpl.decode(test.preState.p_kappa.toBinary()).value
        ),
      ),
      p_offenders: toTagged(dummyDisputesState().offenders),
      p_eta2: toPosterior(dummyEntropy()._2),
      p_eta3: toPosterior(dummyEntropy()._3),
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
