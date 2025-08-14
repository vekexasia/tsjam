import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { DisputeExtrinsic, Validated } from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import type { JamStateImpl } from "../jam-state-impl";
import type { TauImpl } from "../slot-impl";
import {
  type DisputesCulpritError,
  DisputesCulprits,
} from "./disputes/culprits";
import { type DisputesFaultError, DisputesFaults } from "./disputes/faults";

import {
  type DisputesVerdictError,
  DisputesVerdicts,
} from "./disputes/verdicts";

/**
 * codec order defined in $(0.7.1 - C.21)
 */
@JamCodecable()
export class DisputeExtrinsicImpl
  extends BaseJamCodecable
  implements DisputeExtrinsic
{
  /**
   * `V`
   * one ore more verdicts. They must be ordered by .hash
   */
  @codec(DisputesVerdicts)
  verdicts!: DisputesVerdicts;

  /**
   * `EC`
   * validators that brought to chain the workreport saying it was valid by guarateeing for it
   * this means that each .hash here should reference a verdict with validity === 0
   * they must be ordered by .ed25519PublicKey
   *
   * There are 2x entried in the culprit array for each in verdicts
   * because when a verdict happen there are always 2 validators involved
   */
  @codec(DisputesCulprits)
  culprits!: DisputesCulprits;
  /**
   * `EF`
   * validators that brought to chain the workreport saying it was valid by guarateeing for it proofs of misbehaviour of one or more validators signing a judgement
   * in contraddiction with the workreport validity
   * they must be ordered by .ed25519PublicKey
   *
   * There is one entry in the faults array for each verdict containing only valid verdicts matching the workreport hash
   *
   */
  @codec(DisputesFaults)
  faults!: DisputesFaults;

  checkValidity(deps: {
    tau: TauImpl;
    kappa: JamStateImpl["kappa"];
    lambda: JamStateImpl["lambda"];
    disputesState: JamStateImpl["disputes"];
  }): Result<
    Validated<DisputeExtrinsicImpl>,
    DisputesVerdictError | DisputesCulpritError | DisputesFaultError
  > {
    const vRes = this.verdicts.checkValidity({
      tau: deps.tau,
      kappa: deps.kappa,
      lambda: deps.lambda,
      disputesState: deps.disputesState,
    });
    if (vRes.isErr()) {
      return err(vRes.error);
    }

    const bold_v = vRes.value.votes();
    const cRes = this.culprits.checkValidity({
      bold_v,
      disputesState: deps.disputesState,
      kappa: deps.kappa,
      lambda: deps.lambda,
    });
    if (cRes.isErr()) {
      return err(cRes.error);
    }

    const fRes = this.faults.checkValidity({
      bold_v,
      kappa: deps.kappa,
      lambda: deps.lambda,
      disputesState: deps.disputesState,
    });
    if (fRes.isErr()) {
      return err(fRes.error);
    }

    // NOTE: all posterior checks are done in disputes state
    return ok(toTagged(this));
  }
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("codecEd", () => {
    it("disputes_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("disputes_extrinsic.bin");
      const { value: ed } = DisputeExtrinsicImpl.decode(bin);
      expect(Buffer.from(ed.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("disputes_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("disputes_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const ed: DisputeExtrinsicImpl = DisputeExtrinsicImpl.fromJSON(json);

      expect(ed.toJSON()).to.deep.eq(json);
    });
  });
}
