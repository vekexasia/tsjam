import { describe, expect, it } from "vitest";

import { AssurancesExtrinsicImpl } from "@/classes/extrinsics/assurances";
import { JamSignedHeaderImpl } from "@/classes/JamHeaderImpl";
import { RHOImpl } from "@/classes/RHOImpl";
import { ValidatorsImpl } from "@/classes/ValidatorsImpl";
import { WorkReportImpl } from "@/classes/WorkReportImpl";
import {
  BaseJamCodecable,
  JamCodecable,
  codec,
  createArrayLengthDiscriminator,
  eSubIntCodec,
  hashCodec,
} from "@tsjam/codec";
import { Dagger, HeaderHash, Tagged, Tau } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import fs from "node:fs";
import { TestOutputCodec } from "./codec_utils";

export const getCodecFixtureFile = (
  filename: string,
  kind: "full",
): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../jamtestvectors/stf/assurances/${kind}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};
@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(RHOImpl)
  d_rho!: Dagger<RHOImpl>;
  @codec(ValidatorsImpl)
  kappa!: Tagged<ValidatorsImpl, "kappa">;
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(AssurancesExtrinsicImpl)
  ea!: AssurancesExtrinsicImpl;

  @eSubIntCodec(4)
  slot!: Tau;

  @hashCodec()
  parentHash!: HeaderHash;
}

@JamCodecable()
class Test extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;

  @codec(TestState)
  preState!: TestState;

  @codec(TestOutputCodec(createArrayLengthDiscriminator(WorkReportImpl)))
  output!: { error?: 0 | 1 | 2 | 3 | 4 | 5; output?: WorkReportImpl[] };

  @codec(TestState)
  postState!: TestState;
}

describe("assurances", () => {
  const doTest = (filename: string, kind: "full") => {
    const { value: test } = Test.decode(
      getCodecFixtureFile(`${filename}.bin`, kind),
    );
    expect(test.preState.kappa).deep.eq(test.postState.kappa);
    const eaVerified = test.input.ea.isValid({
      header: new JamSignedHeaderImpl({ parent: test.input.parentHash }),
      kappa: test.preState.kappa,
      d_rho: test.preState.d_rho,
    });
    const shouldBeVerified = typeof test.output.error === "undefined";

    expect(eaVerified).eq(shouldBeVerified);
    if (!eaVerified) {
      return;
    }
    const dd_rho = RHOImpl.toDoubleDagger(test.preState.d_rho, {
      rho: test.preState.d_rho,
      p_tau: toPosterior(test.input.slot),
      newReports: AssurancesExtrinsicImpl.newlyAvailableReports(
        toTagged(test.input.ea),
        test.preState.d_rho,
      ),
    });
    expect(dd_rho, "dd_rho").deep.eq(test.postState.d_rho);
    return true;
  };
  const set = "full";

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
