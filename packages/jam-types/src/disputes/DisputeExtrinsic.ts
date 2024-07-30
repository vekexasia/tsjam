import {
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  u32,
} from "@/genericTypes.js";

export interface DisputeExtrinsic {
  // one ore more verdicts as a compilation of
  // jusdgements coming from 2/3+1 (current or prevset) active validators
  verdicts: {
    /**
     * the hash of the work report
     */
    hash: Hash;
    /**
     * Defines which epoch index the validators reporting the verdict are referring to
     * it can be either current or previous epoch
     */
    epochIndex: u32;
    verdict: Array<{
      validity: 0 | 1;
      /**
       * the index of the validator in the validator set for the specified epoch
       */
      validatorIndex: u32;
      /**
       * the signature of the validator
       */
      signature: ED25519Signature;
    }>;
  };

  // proofs of misbehaviour of one or more validators to befound invalid
  // they must be ordered by .ed25519PublicKey
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

  // proofs of misbehaviour of one or more validators signing a judgement
  // in contraddiction with the workreport validity
  // they must be ordered by .ed25519PublicKey
  faults: Array<{
    hashe: Hash;
    validity: 0 | 1;
    ed25519PublicKey: ED25519PublicKey;
    /**
     * judgement pauload
     */
    signature: ED25519Signature;
  }>;
}
