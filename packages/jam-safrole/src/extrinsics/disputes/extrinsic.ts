import {
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  MinSeqLength,
  SeqOfLength,
  ValidatorIndex,
  u32,
} from "@vekexasia/jam-types";
import { MINIMUM_VALIDATORS } from "@vekexasia/jam-types";
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
   * validators that brought to chain the workreport saying it was valid by guarateeing for it
   * this means that each .hash here should reference a verdict with validity === 0
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
   * validators that brought to chain the workreport saying it was valid by guarateeing for it proofs of misbehaviour of one or more validators signing a judgement
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
