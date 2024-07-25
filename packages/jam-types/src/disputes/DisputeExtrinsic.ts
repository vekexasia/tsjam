import { ED25519PublicKey, ED25519Signature, Hash } from "@/genericTypes.js";

export interface DisputeExtrinsic {
  // one ore more verdicts as a compilation of
  // jusdgements coming from 2/3+1 (current or prevset) active validators
  verdicts: {
    hash: Hash;
    a: unknown;
  };

  // proofs of misbehaviour of one or more validators to befound invalid
  // they must be ordered by .ed25519PublicKey
  culprits: Array<{
    hashe: Hash;
    ed25519PublicKey: ED25519PublicKey;
    signature: ED25519Signature;
  }>;

  // proofs of misbehaviour of one or more validators signing a judgement
  // in contraddiction with the workreport validity
  // they must be ordered by .ed25519PublicKey
  faults: Array<{
    hashe: Hash;
    unknoiwn: unknown;
    ed25519PublicKey: ED25519PublicKey;
    signature: ED25519Signature;
  }>;
}
