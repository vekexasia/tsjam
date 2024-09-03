import {
  Hash,
  JAM_GUARANTEE,
  JAM_INVALID,
  JAM_VALID,
  NUMBER_OF_VALIDATORS,
  Posterior,
  newSTF,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { DisputeExtrinsic, IDisputesState } from "@/extrinsics/index.js";
import { Ed25519 } from "@vekexasia/jam-crypto";
import { bigintToBytes } from "@vekexasia/jam-codec";
import assert from "node:assert";
import { epochIndex } from "@/utils.js";

/**
 * Computes state transition for disputes state
 */
export const disputesSTF = newSTF<
  IDisputesState,
  {
    kappa: SafroleState["kappa"];
    lambda: SafroleState["lambda"];
    extrinsic: DisputeExtrinsic;
    curTau: SafroleState["tau"];
  }
>({
  apply(
    input: {
      kappa: SafroleState["kappa"];
      lambda: SafroleState["lambda"];
      extrinsic: DisputeExtrinsic;
    },
    curState: IDisputesState,
  ) {
    const V: Array<{ reportHash: Hash; votes: number }> =
      input.extrinsic.verdicts.map((verdict) => {
        return {
          reportHash: verdict.hash,
          votes: verdict.judgements.reduce(
            (acc, curr) => acc + curr.validity,
            0,
          ),
        };
      });
    return {
      // (112) of the graypaper
      psi_g: new Set([
        ...curState.psi_g,
        ...V.filter(
          ({ votes }) => votes == (NUMBER_OF_VALIDATORS * 2) / 3 + 1,
        ).map(({ reportHash }) => reportHash),
      ]),

      // (113) of the graypaper
      psi_b: new Set([
        ...curState.psi_b,
        ...V.filter(({ votes }) => votes == 0).map(
          ({ reportHash }) => reportHash,
        ),
      ]),

      // (114) of the graypaper
      psi_w: new Set([
        ...curState.psi_w,
        ...V.filter(({ votes }) => votes == NUMBER_OF_VALIDATORS / 3).map(
          ({ reportHash }) => reportHash,
        ),
      ]),

      // (115) of the graypaper
      psi_o: new Set([
        ...curState.psi_o,
        ...input.extrinsic.culprit.map(
          ({ ed25519PublicKey }) => ed25519PublicKey,
        ),
        ...input.extrinsic.faults.map(
          ({ ed25519PublicKey }) => ed25519PublicKey,
        ),
      ]),
    } as Posterior<IDisputesState>;
  },

  assertInputValid(input, curState) {
    // enforce culprit keys are not in psi_o and signture is valid
    // (102)
    input.extrinsic.culprit.forEach((culprit) => {
      if (curState.psi_o.has(culprit.ed25519PublicKey)) {
        throw new Error("culprit.ed25519PublicKey must not be in psi_o");
      }
      const verified = Ed25519.verifySignature(
        culprit.signature,
        culprit.ed25519PublicKey,
        new Uint8Array([...JAM_GUARANTEE, ...bigintToBytes(culprit.hash, 32)]),
      );
      assert(verified, "culprit signature is invalid");
      // each culprit should reference a verdict
      if (!input.extrinsic.verdicts.some((v) => v.hash === culprit.hash)) {
        throw new Error("culprit.hash must reference a verdict");
      }
    });

    // enforce faults keys are not in psi_o and signature is valid
    // (102)
    input.extrinsic.faults.forEach((fault) => {
      if (curState.psi_o.has(fault.ed25519PublicKey)) {
        throw new Error("fault.ed25519PublicKey must not be in psi_o");
      }
      const verified = Ed25519.verifySignature(
        fault.signature,
        fault.ed25519PublicKey,
        new Uint8Array([
          ...(fault.validity === 1 ? JAM_VALID : JAM_INVALID),
          ...bigintToBytes(fault.hash, 32),
        ]),
      );
      assert(verified, "culprit signature is invalid");
    });

    // enforce verdicts are ordered and not duplicated by report hash
    // (103)
    input.extrinsic.verdicts.length === 0 ||
      input.extrinsic.verdicts.reduce((prev, curr) => {
        if (prev.hash >= curr.hash) {
          throw new Error("verdicts must be ordered/unique by .hash");
        }
        return curr;
      });

    input.extrinsic.verdicts.forEach((verdict) => {
      if (verdict.epochIndex < epochIndex(input.curTau) - 1) {
        throw new Error("verdicts must be for the current or previous epoch");
      }
    });

    // enforce culprit are ordered by ed25519PublicKey
    // (104)
    input.extrinsic.culprit.length === 0 ||
      input.extrinsic.culprit.reduce((prev, curr) => {
        if (prev.ed25519PublicKey >= curr.ed25519PublicKey) {
          throw new Error(
            "culprit must be ordered/unique by .ed25519PublicKey",
          );
        }
        return curr;
      });

    // enforce faults are ordered by ed25519PublicKey
    // (104)
    input.extrinsic.faults.length === 0 ||
      input.extrinsic.faults.reduce((prev, curr) => {
        if (prev.ed25519PublicKey >= curr.ed25519PublicKey) {
          throw new Error("faults must be ordered/unique by .ed25519PublicKey");
        }
        return curr;
      });

    // ensure verdict report hashes are not in psi_g or psi_b or psi_w
    // aka not in the set of work reports that were judged to be valid, bad or wonky already
    // (105)
    input.extrinsic.verdicts.forEach((verdict) => {
      if (
        curState.psi_g.has(verdict.hash) ||
        curState.psi_b.has(verdict.hash) ||
        curState.psi_w.has(verdict.hash)
      ) {
        throw new Error("verdict.hash must not be in psi_g, psi_b or psi_w");
      }
    });

    // ensure judgements are ordered by validatorIndex
    // (106)
    input.extrinsic.verdicts.forEach((verdict) => {
      verdict.judgements.reduce((prev, curr) => {
        if (prev.validatorIndex >= curr.validatorIndex) {
          throw new Error(
            "judgements must be ordered/unique by .validatorIndex",
          );
        }
        return curr;
      });
    });

    // ensure that judgements are either 0 or 1/3 NUM_VALIDATORS or 2/3+1 of NUM_VALIDATORS
    // (107) and (108)
    // first compute `V`
    const V: Array<{ reportHash: Hash; votes: number }> =
      input.extrinsic.verdicts.map((verdict) => {
        return {
          reportHash: verdict.hash,
          votes: verdict.judgements.reduce(
            (acc, curr) => acc + curr.validity,
            0,
          ),
        };
      });
    if (
      !V.every((v) => {
        switch (v.votes) {
          case 0:
          case NUMBER_OF_VALIDATORS / 3:
          case (2 * NUMBER_OF_VALIDATORS) / 3 + 1:
            return true;
          default:
            return false;
        }
      })
    ) {
      throw new Error(
        "judgements must be 0 or 1/3 or 2/3+1 of NUM_VALIDATORS" +
          NUMBER_OF_VALIDATORS,
      );
    }

    const negativeVerdicts = V.filter((v) => v.votes === 0);
    const positiveVerdicts = V.filter(
      (v) => v.votes === (2 * NUMBER_OF_VALIDATORS) / 3 + 1,
    );

    // ensure any positive verdicts are in faults
    // (109)
    positiveVerdicts.forEach((v) => {
      if (!input.extrinsic.faults.some((f) => f.hash === v.reportHash)) {
        throw new Error("positive verdicts must be in faults");
      }
    });

    // ensure any negative verdicts have at least 2 in cuprit
    // (110)
    negativeVerdicts.forEach((v) => {
      if (
        input.extrinsic.culprit.filter((c) => c.hash === v.reportHash).length <
        2
      ) {
        throw new Error("negative verdicts must have at least 2 in culprit");
      }
    });

    // verify all signatures
    input.extrinsic.verdicts.forEach((verdict) => {
      const validatorSet =
        verdict.epochIndex === epochIndex(input.curTau)
          ? input.kappa
          : input.lambda;
      verdict.judgements.forEach((judgement) => {
        const validatorPubKey = validatorSet[judgement.validatorIndex].ed25519;
        let message: Uint8Array;
        if (judgement.validity === 1) {
          message = new Uint8Array([
            ...JAM_VALID,
            ...bigintToBytes(verdict.hash, 32),
          ]);
        } else {
          message = new Uint8Array([
            ...JAM_INVALID,
            ...bigintToBytes(verdict.hash, 32),
          ]);
        }
        const signatureVerified = Ed25519.verifySignature(
          judgement.signature,
          validatorPubKey,
          message,
        );
        if (!signatureVerified) {
          throw new Error("judgement signature is invalid");
        }
      });
    });

    return V;
  },

  assertPStateValid(input, p_state) {
    // perform some other last checks
    // (102) of the graypaper states that faults reports should be in psi_b' if `r`
    input.extrinsic.faults.forEach(({ hash, validity }) => {
      if (validity == 1) {
        if (!(p_state.psi_b.has(hash) && !p_state.psi_g.has(hash))) {
          throw new Error(
            "with fault validity 1, the report must be in psi_b' and not in psi_o'",
          );
        }
      } else {
        if (!(!p_state.psi_b.has(hash) && p_state.psi_g.has(hash))) {
          throw new Error(
            "with fault validity 0, the report must NOT be in psi_b' and in psi_o'",
          );
        }
      }
    });

    // (101) of the graypaper culrpit reports should be in psi_b'
    input.extrinsic.culprit.forEach(({ hash }) => {
      if (!p_state.psi_b.has(hash)) {
        throw new Error("culprit must be in psi_b'");
      }
    });
    // todo: missing 111
  },
});
