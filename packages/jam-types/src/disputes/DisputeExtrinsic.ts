import {
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MinSeqLength,
  SeqOfLength,
  u32,
  ValidatorIndex,
} from "@/genericTypes.js";
import { MINIMUM_VALIDATORS } from "@/consts.js";
import { DisputesState } from "@/disputes/DisputesState.js";
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
       * the hash of the work report
       */
      hash: Hash;
      /**
       * Defines which epoch index the validators reporting the verdict are referring to
       * it can be either current or previous epoch
       */
      epochIndex: u32;

      /**
       * the length of this sequence must be at least 2/3+1
       *
       * the sequence must be ordered by .validatorIndex
       */
      judgements: SeqOfLength<
        {
          validity: 0 | 1;
          /**
           * the index of the validator in the validator set for the specified epoch
           */
          validatorIndex: ValidatorIndex;
          /**
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
     * the hash of the work report
     * this will alter DisputesState.psi_b by making sure that the work report is in the set
     * @see DisputesState.psi_b
     */
    hash: Hash;

    /**
     * the validator public key
     * This must be either in the current or prev set of validators
     * it must not be inside DisputesState.psi_o
     * @see DisputesState.psi_o
     */
    ed25519PublicKey: ED25519PublicKey;

    /**
     * the signature of the garantor payload
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

const compareUint8Array = (a: Uint8Array, b: Uint8Array): -1 | 0 | 1 => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) {
      return -1;
    }
    if (a[i] > b[i]) {
      return 1;
    }
  }
  return 0; // a === b
};

export const checkDisputeExtrinsic = (
  extrinsic: DisputeExtrinsic,
  currState: DisputesState,
): void => {
  extrinsic.verdicts.reduce((prev, curr) => {
    if (compareUint8Array(prev.hash, curr.hash) !== -1) {
      throw new Error("verdicts must be ordered by .hash");
    }
    return curr;
  });
  extrinsic.culprit.reduce((prev, curr) => {
    const cmp = compareUint8Array(prev.ed25519PublicKey, curr.ed25519PublicKey);
    if (cmp !== -1) {
      throw new Error(
        "culprit must be ordered/not duplicated by .ed25519PublicKey",
      );
    }
    return curr;
  });
  extrinsic.faults.reduce((prev, curr) => {
    const cmp = compareUint8Array(prev.ed25519PublicKey, curr.ed25519PublicKey);
    if (cmp !== -1) {
      throw new Error(
        "faults must be ordered/not duplicated by .ed25519PublicKey",
      );
    }
    return curr;
  });
  extrinsic.culprit.forEach((culprit) => {
    if (currState.psi_o.has(culprit.ed25519PublicKey)) {
      throw new Error("culprit.ed25519PublicKey must not be in psi_o");
    }
  });
  extrinsic.faults.forEach((fault) => {
    if (currState.psi_o.has(fault.ed25519PublicKey)) {
      throw new Error("fault.ed25519PublicKey must not be in psi_o");
    }
  });
};
