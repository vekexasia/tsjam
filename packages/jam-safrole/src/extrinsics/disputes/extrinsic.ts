import {
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MinSeqLength,
  NUMBER_OF_VALIDATORS,
  SeqOfLength,
  u32,
  ValidatorIndex,
} from "@vekexasia/jam-types";
import { MINIMUM_VALIDATORS } from "@vekexasia/jam-types";
import { IDisputesState } from "@/extrinsics/disputes/state.js";
/**
 * Identified ad E<sub>d</sub> in the paper
 */
export interface DisputeExtrinsic {
  /**
   * one ore more verdicts. They must be ordered by .hash
   */
  verdicts: MinSeqLength<
    {
      /**
       * `r` - the hash of the work report
       */
      hash: Hash;
      /**
       * `a` - Defines which epoch index the validators reporting the verdict are referring to
       * it can be either current or previous epoch
       */
      epochIndex: u32;

      /**
       * `j` - the length of this sequence must be at least 2/3+1
       *
       * the sequence must be ordered by .validatorIndex
       */
      judgements: SeqOfLength<
        {
          /**
           * `v` - the validity of the work report
           * 0 - valid
           * 1 - invalid
           */
          validity: 0 | 1;
          /**
           * `i` - the validator index
           * the index of the validator in the validator set for the specified epoch
           */
          validatorIndex: ValidatorIndex;
          /**
           * `s` - the signature of the validator
           * the signature of the validator
           * the signature must be either
           *  - $jam_valid + workReportHash
           *  - $jam_invalid + workReportHash
           */
          signature: ED25519Signature;
        },
        typeof MINIMUM_VALIDATORS // 2/3+1 of 1023 which is the number of validators
      >;
    },
    1
  >;

  /**
   * proofs of misbehaviour of one or more validators to befound invalid
   * they must be ordered by .ed25519PublicKey
   *
   * There are 2x entried in the culprit array for each in verdicts
   * because when a verdict happen there are always 2 validators involved
   */
  culprit: Array<{
    /**
     * `r` - the hash of the work report
     * this will alter DisputesState.psi_b by making sure that the work report is in the set
     * @see DisputesState.psi_b
     */
    hash: Hash;

    /**
     * `k` - the validator public key
     * This must be either in the current or prev set of validators
     * it must not be inside DisputesState.psi_o
     * @see DisputesState.psi_o
     */
    ed25519PublicKey: ED25519PublicKey;

    /**
     * `s` - the signature of the garantor payload
     * the payload needs to be $jam_guarantee + workReportHash
     */
    signature: ED25519Signature;
  }>;

  /**
   * proofs of misbehaviour of one or more validators signing a judgement
   * in contraddiction with the workreport validity
   * they must be ordered by .ed25519PublicKey
   *
   * There is one entry in the faults array for each verdict containing only valid verdicts matching the workreport hash
   *
   */
  faults: Array<{
    /**
     * the hash of the work report
     * - if (validity === 0) then the work report must be in posterior `psi_g` and **NOT** in posterior `psi_b`
     * - if (validity === 1) then the work report must **NOT** be in posterior `psi_g` and in posterior `psi_b`
     * @see DisputesState.psi_b
     * @see DisputesState.psi_g
     */
    hash: Hash;

    /**
     * the signaled validity of the work report
     */
    validity: 0 | 1;

    /**
     * the validator public key
     * This must be either in the current or prev set of validators
     * and it must not be inside DisputesState.psi_o
     * @see DisputesState.psi_o
     */
    ed25519PublicKey: ED25519PublicKey;

    /**
     * payload should be $jam_valid + workReportHash or $jam_invalid + workReportHash
     */
    signature: ED25519Signature;
  }>;
}

/**
 * Asserts that the dispute extrinsic is valid
 * if valid it returns the computed `V` as per the graypaper
 * @see (107)
 * @param extrinsic - the dispute extrinsic to be validated
 * @param currState - the current state of the disputes state machine
 * @throws {Error} if the extrinsic is not valid
 */
export const assertDisputeExtrinsicValid = (
  extrinsic: DisputeExtrinsic,
  currState: IDisputesState,
): Array<{ reportHash: Hash; votes: number }> => {
  // enforce culprit keys are not in psi_o
  // (102)
  extrinsic.culprit.forEach((culprit) => {
    if (currState.psi_o.has(culprit.ed25519PublicKey)) {
      throw new Error("culprit.ed25519PublicKey must not be in psi_o");
    }
    // todo : validate signature with JAM_GUARANTEE + workReportHash
  });

  // enforce faults keys are not in psi_o
  // (102)
  extrinsic.faults.forEach((fault) => {
    if (currState.psi_o.has(fault.ed25519PublicKey)) {
      throw new Error("fault.ed25519PublicKey must not be in psi_o");
    }
    // todo : validate signature with JAM_VALID + workReportHash or JAM_INVALID + workReportHash
  });

  // enforce verdicts are ordered and not duplicated by report hash
  // (103)
  extrinsic.verdicts.reduce((prev, curr) => {
    if (prev.hash >= curr.hash) {
      throw new Error("verdicts must be ordered/not duplicated by .hash");
    }
    return curr;
  });
  // enforce culprit are ordered by ed25519PublicKey
  // (104)
  extrinsic.culprit.reduce((prev, curr) => {
    if (prev.ed25519PublicKey >= curr.ed25519PublicKey) {
      throw new Error(
        "culprit must be ordered/not duplicated by .ed25519PublicKey",
      );
    }
    return curr;
  });
  // enforce faults are ordered by ed25519PublicKey
  // (104)
  extrinsic.faults.reduce((prev, curr) => {
    if (prev.ed25519PublicKey >= curr.ed25519PublicKey) {
      throw new Error(
        "faults must be ordered/not duplicated by .ed25519PublicKey",
      );
    }
    return curr;
  });

  // ensure verdict report hashes are not in psi_g or psi_b or psi_w
  // aka not in the set of work reports that were judged to be valid, bad or wonky already
  // (105)
  extrinsic.verdicts.forEach((verdict) => {
    if (
      currState.psi_g.has(verdict.hash) ||
      currState.psi_b.has(verdict.hash) ||
      currState.psi_w.has(verdict.hash)
    ) {
      throw new Error("verdict.hash must not be in psi_g, psi_b or psi_w");
    }
  });

  // ensure judgements are ordered by validatorIndex
  // (106)
  extrinsic.verdicts.forEach((verdict) => {
    verdict.judgements.reduce((prev, curr) => {
      if (prev.validatorIndex >= curr.validatorIndex) {
        throw new Error("judgements must be ordered by .validatorIndex");
      }
      return curr;
    });
  });

  // ensure that judgements are either 0 or 1/3 NUM_VALIDATORS or 2/3+1 of NUM_VALIDATORS
  // (107) and (108)
  // first compute `V`

  const V: Array<{ reportHash: Hash; votes: number }> = extrinsic.verdicts.map(
    (verdict) => {
      return {
        reportHash: verdict.hash,
        votes: verdict.judgements.reduce((acc, curr) => acc + curr.validity, 0),
      };
    },
  );
  if (
    V.every((v) => {
      switch (v.votes) {
        case 0:
        case NUMBER_OF_VALIDATORS / 3:
        case (2 * NUMBER_OF_VALIDATORS) / 3 + 1:
          return true;
          break;
        default:
          return false;
      }
    })
  ) {
    throw new Error("judgements must be 0 or 1/3 or 2/3+1 of NUM_VALIDATORS");
  }

  const negativeVerdicts = V.filter((v) => v.votes === 0);
  const positiveVerdicts = V.filter(
    (v) => v.votes === (2 * NUMBER_OF_VALIDATORS) / 3 + 1,
  );

  // ensure any positive verdicts are in faults
  // (109)
  positiveVerdicts.forEach((v) => {
    if (!extrinsic.faults.some((f) => f.hash === v.reportHash)) {
      throw new Error("positive verdicts must be in faults");
    }
  });

  // ensure any negative verdicts have at least 2 in cuprit
  // (110)
  negativeVerdicts.forEach((v) => {
    if (extrinsic.culprit.filter((c) => c.hash === v.reportHash).length < 2) {
      throw new Error("negative verdicts must have at least 2 in culprit");
    }
  });
  return V;
};
// todo: missing 111
