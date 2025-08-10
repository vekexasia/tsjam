import { AssurancesExtrinsicImpl } from "@/classes/extrinsics/assurances";
import { JamSignedHeaderImpl } from "@/classes/JamSignedHeaderImpl";
import { KappaImpl } from "@/classes/KappaImpl";
import { RHOImpl } from "@/classes/RHOImpl";
import { SlotImpl, TauImpl } from "@/classes/SlotImpl";
import { WorkReportImpl } from "@/classes/WorkReportImpl";
import { HashCodec } from "@/codecs/miscCodecs";
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

  @codec(TestOutputCodec(createArrayLengthDiscriminator(WorkReportImpl)))
  output!: { err?: 0 | 1 | 2 | 3 | 4 | 5; ok?: WorkReportImpl[] };

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
