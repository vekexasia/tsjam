// H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)

import {
  BandersnatchKey,
  ED25519Signature,
  Hash,
  MerkeTreeRoot,
} from "@/genericTypes.js";

export interface JamHeader {
  /**
   * **Hp:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  previousHash: Uint8Array;
  /**
   * **Hr:** The hash of the state root.
   */
  priorStateRoot: MerkeTreeRoot; // Hr
  /**
   * **Hx:** The hash of the block's extrinsic data.
   */
  extrinsicHash: Uint8Array;
  /**
   * **Ht:** The block's time slot index since jam epoch (time slot is 6 secs long).
   */
  timeSlotIndex: number; // Ht
  /**
   * **He:** The epoch marker of the block.
   * @see section 5.1
   */
  epochMarker?: {
    // 4 byte see (65) on section 6.5
    entropy: bigint;
    // 32 byte bandersnatch
    validatorKeys: BandersnatchKey[];
  };

  winningTicket?: Uint8Array; // Hw
  // section 10
  // must contain exactly the sequence of report hashes of only bad and wonky verdicts
  // does not nneed to be included in the serialization. this is here for convenience
  // but it's just the result of other variables
  judgementsMarkers: Hash[]; // Hj
  // todo: section 5 says it's a 32 byte hash
  // but later Hk E Nv. so its a natural number
  blockAuthorKey: number; // < V or < number of validators
  entropySignature: ED25519Signature; // Hv
}

export interface SignedJamHeader extends JamHeader {
  /**
   * The signature of the block. Must be signed by the validator associated to this time slot.
   */
  blockSeal: ED25519Signature; // Hs
}

export * from "./JamBlock.js";
export * from "./genericTypes.js";
export * from "./ValidatorData.js";
