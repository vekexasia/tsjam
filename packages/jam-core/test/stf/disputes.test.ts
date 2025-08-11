import { DisputesStateImpl } from "@/classes/DisputesStateImpl";
import { DisputeExtrinsicImpl } from "@/classes/extrinsics/disputes";
import { JamHeaderImpl } from "@/classes/JamHeaderImpl";
import { JamStateImpl } from "@/classes/JamStateImpl";
import { KappaImpl } from "@/classes/KappaImpl";
import { LambdaImpl } from "@/classes/LambdaImpl";
import { RHOImpl } from "@/classes/RHOImpl";
import { SlotImpl, TauImpl } from "@/classes/SlotImpl";
import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import * as fs from "node:fs";
import { describe, expect, it } from "vitest";
import { TestOutputCodec } from "../codec_utils";

@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(DisputesStateImpl)
  psi!: DisputesStateImpl;

  @codec(RHOImpl)
  rho!: RHOImpl;

  @codec(SlotImpl)
  tau!: TauImpl;

  @codec(KappaImpl)
  kappa!: JamStateImpl["kappa"];

  @codec(LambdaImpl)
  lambda!: JamStateImpl["lambda"];
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(DisputeExtrinsicImpl)
  extrinsic!: DisputeExtrinsicImpl;
}
@JamCodecable()
class TestOutputOk extends BaseJamCodecable {
  @codec(JamHeaderImpl.codecOf("offendersMark"))
  offendersMark!: JamHeaderImpl["offendersMark"];
}

@JamCodecable()
class TestCase extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;
  @codec(TestState)
  pre_state!: TestState;
  @codec(TestOutputCodec(TestOutputOk))
  output!: { err?: number; ok?: TestOutputOk[] };
  @codec(TestState)
  post_state!: TestState;
}
const buildTest = (name: string) => {
  const test = fs.readFileSync(
    `${__dirname}/../../../../jamtestvectors/stf/disputes/full/${name}.bin`,
  );

  const { value: testCase } = TestCase.decode(test);

  const [extrinsicErr, validExtrinsic] = testCase.input.extrinsic
    .checkValidity({
      disputesState: testCase.pre_state.psi,
      tau: testCase.pre_state.tau,
      kappa: testCase.pre_state.kappa,
      lambda: testCase.pre_state.lambda,
    })
    .safeRet();
  if (typeof extrinsicErr !== "undefined") {
    throw new Error(extrinsicErr);
  }

  const [ppsiErr, p_psi] = testCase.pre_state.psi
    .toPosterior({
      kappa: testCase.pre_state.kappa,
      lambda: testCase.pre_state.lambda,
      extrinsic: validExtrinsic,
    })
    .safeRet();

  if (ppsiErr) {
    throw new Error(ppsiErr);
  }

  expect(p_psi.toJSON()).toEqual(testCase.post_state.psi.toJSON());
};

describe("disputes-test-vectors", () => {
  const test = (name: string) => buildTest(name);
  it("progress_with_no_verdicts-1", () => test("progress_with_no_verdicts-1"));
  it("progress_with_verdicts-1", () =>
    expect(() => test("progress_with_verdicts-1")).toThrow(
      "JUDGEMENTS_NOT_ORDERED",
    ));
  it("progress_with_verdicts-2", () =>
    expect(() => test("progress_with_verdicts-2")).toThrow(
      "JUDGEMENTS_NOT_ORDERED",
    ));
  it("progress_with_verdicts-3", () =>
    expect(() => test("progress_with_verdicts-3")).toThrow(
      "VERDICTS_MUST_BE_ORDERED_UNIQUE_BY_HASH",
    ));
  it("progress_with_verdicts-4", () => test("progress_with_verdicts-4"));
  it("progress_with_verdicts-5", () =>
    expect(() => test("progress_with_verdicts-5")).toThrow("JUDGEMENTS_WRONG"));
  it("progress_with_verdicts-6", () => test("progress_with_verdicts-6"));
  it("progress_with_culprits-1", () =>
    expect(() => test("progress_with_culprits-1")).toThrow(
      "NEGATIVE_VERDICTS_NOT_IN_CULPRIT",
    ));
  it("progress_with_culprits-2", () =>
    expect(() => test("progress_with_culprits-2")).toThrow(
      "NEGATIVE_VERDICTS_NOT_IN_CULPRIT",
    ));
  it("progress_with_culprits-3", () =>
    expect(() => test("progress_with_culprits-3")).toThrow(
      "CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY",
    ));
  it("progress_with_culprits-4", () => test("progress_with_culprits-4"));
  it("progress_with_culprits-5", () =>
    expect(() => test("progress_with_culprits-5")).toThrow(
      "VERDICTS_IN_PSI_B",
    ));
  it("progress_with_culprits-6", () =>
    expect(() => test("progress_with_culprits-6")).toThrow("CULPRITKEYNOTINK"));
  it("progress_with_culprits-7", () =>
    expect(() => test("progress_with_culprits-7")).toThrow(
      "CULPRIT_NOT_IN_PSIB",
    ));
  it("progress_with_faults-1", () =>
    expect(() => test("progress_with_faults-1")).toThrow(
      "POSITIVE_VERDICTS_NOT_IN_FAULTS",
    ));
  it("progress_with_faults-2", () => test("progress_with_faults-2"));
  it("progress_with_faults-3", () =>
    expect(() => test("progress_with_faults-3")).toThrow(
      "FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY",
    ));
  it("progress_with_faults-4", () => test("progress_with_faults-4"));
  it("progress_with_faults-5", () =>
    expect(() => test("progress_with_faults-5")).toThrow("VERDICTS_IN_PSI_W"));
  it("progress_with_faults-6", () =>
    expect(() => test("progress_with_faults-6")).toThrow("FAULTKEYNOTINK"));
  it("progress_with_faults-7", () =>
    expect(() => test("progress_with_faults-7")).toThrow(
      "with fault validity 1, the report must be in psi_b' and not in psi_o'",
    ));
  it("progress_invalidates_avail_assignments-1", () =>
    test("progress_invalidates_avail_assignments-1"));
  it("progress_with_bad_signatures-1", () =>
    expect(() => test("progress_with_bad_signatures-1")).toThrow(
      "JUDGEMENT_SIGNATURE_WRONG",
    ));
  it("progress_with_bad_signatures-2", () =>
    expect(() => test("progress_with_bad_signatures-2")).toThrow(
      "CULPRITSIGNATURESWRONG",
    ));
  it("progress_with_verdict_signatures_from_previous_set-1", () =>
    test("progress_with_verdict_signatures_from_previous_set-1"));
  it("progress_with_verdict_signatures_from_previous_set-2", () =>
    expect(() =>
      test("progress_with_verdict_signatures_from_previous_set-2"),
    ).toThrow("EPOCH_INDEX_WRONG"));
});
