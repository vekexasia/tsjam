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
   * There are 2x entried in the culprit array for ea
   */
  culprit: Array<{
    /**
     * the hash of the work report
     */
    hash: Hash;

    /**
     * the validator public key
     */
    ed25519PublicKey: ED25519PublicKey;

    /**
     * the signature of the garantor payload
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
     */
    hash: Hash;

    /**
     * the signaled validity of the work report
     */
    validity: 0 | 1;

    /**
     * the validator public key
     */
    ed25519PublicKey: ED25519PublicKey;

    /**
     * judgement pauload
     */
    signature: ED25519Signature;
  }>;
}
