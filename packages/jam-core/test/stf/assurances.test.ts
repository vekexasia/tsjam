import { AssurancesExtrinsicImpl } from "@/impls/extrinsics/assurances";
import { KappaImpl } from "@/impls/kappa-impl";
import { RHOImpl } from "@/impls/rho-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import { WorkReportImpl } from "@/impls/work-report-impl";
import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  JamCodecable,
  codec,
  createArrayLengthDiscriminator,
} from "@tsjam/codec";
import { Dagger, HeaderHash, Posterior, Tagged, Validated } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { TestOutputCodec } from "../codec-utils";
import { getConstantsMode } from "@tsjam/constants";

export const getCodecFixtureFile = (filename: string): Uint8Array => {
  return new Uint8Array(
    fs.readFileSync(
      new URL(
        `../../../../jamtestvectors/stf/assurances/${getConstantsMode()}/${filename}`,
        import.meta.url,
      ).pathname,
    ),
  );
};
@JamCodecable()
class TestState extends BaseJamCodecable {
  @codec(RHOImpl)
  d_rho!: Dagger<RHOImpl>;
  @codec(KappaImpl)
  kappa!: Tagged<KappaImpl, "kappa">;
}
@JamCodecable()
class TestInput extends BaseJamCodecable {
  @codec(AssurancesExtrinsicImpl)
  ea!: AssurancesExtrinsicImpl;

  @codec(SlotImpl)
  slot!: Validated<Posterior<TauImpl>>;

  @codec(HashCodec)
  parentHash!: HeaderHash;
}

@JamCodecable()
class Test extends BaseJamCodecable {
  @codec(TestInput)
  input!: TestInput;

  @codec(TestState)
  preState!: TestState;

  // @ts-expect-error we dont use JSON
  @codec(TestOutputCodec(createArrayLengthDiscriminator(WorkReportImpl)))
  output!: { err?: 0 | 1 | 2 | 3 | 4 | 5; ok?: WorkReportImpl[] };

  @codec(TestState)
  postState!: TestState;
}

describe("assurances", () => {
  const doTest = (filename: string) => {
    const { value: test } = Test.decode(getCodecFixtureFile(`${filename}.bin`));
    expect(test.preState.kappa).deep.eq(test.postState.kappa);
    const eaVerified = test.input.ea.isValid({
      headerParent: test.input.parentHash,
      kappa: test.preState.kappa,
      d_rho: test.preState.d_rho,
    });
    const shouldBeVerified = typeof test.output.err === "undefined";

    expect(eaVerified).eq(shouldBeVerified);
    if (!eaVerified) {
      return;
    }
    const newReports = AssurancesExtrinsicImpl.newlyAvailableReports(
      toTagged(test.input.ea),
      test.preState.d_rho,
    );
    const dd_rho = test.preState.d_rho.toDoubleDagger({
      rho: test.preState.d_rho,
      p_tau: test.input.slot,
      newReports,
    });
    for (let i = 0; i < dd_rho.elements.length; i++) {
      expect(dd_rho.elements[i]!, `element${i}`).deep.eq(
        test.postState.d_rho.elements[i],
      );
    }

    expect(RHOImpl.toJSON(dd_rho), "dd_rho").deep.eq(
      test.postState.d_rho.toJSON(),
    );
    if (test.output.ok) {
      expect(newReports.elements).deep.eq(test.output.ok, "newReports");
    }
    // TODO: check output.ok?
    return true;
  };

  it("no_assurances-1", () => {
    doTest("no_assurances-1");
  });

  it("some_assurances-1", () => {
    doTest("some_assurances-1");
  });

  it("no_assurances_with_stale_report-1", () => {
    doTest("no_assurances_with_stale_report-1");
  });

  it("assurances_with_bad_signature-1", () => {
    doTest("assurances_with_bad_signature-1");
  });

  it("assurances_with_bad_validator_index-1", () => {
    doTest("assurances_with_bad_validator_index-1");
  });

  it("assurance_for_not_engaged_core-1", () => {
    doTest("assurance_for_not_engaged_core-1");
  });

  it("assurance_with_bad_attestation_parent-1", () => {
    doTest("assurance_with_bad_attestation_parent-1");
  });

  it("assurances_for_stale_report-1", () => {
    doTest("assurances_for_stale_report-1");
  });

  it("assurers_not_sorted_or_unique-1", () => {
    doTest("assurers_not_sorted_or_unique-1");
  });

  it("assurers_not_sorted_or_unique-2", () => {
    doTest("assurers_not_sorted_or_unique-2");
  });
});
