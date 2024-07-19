// H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)

export interface JamHeader {
  /**
   * **Hp:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  previousHash: Uint8Array;
  /**
   * **Hr:** The hash of the state root.
   */
  priorStateRoot: Uint8Array; // Hr
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
    validatorKeys: Uint8Array[];
  };

  winningTicket?: Uint8Array; // Hw
  // section 10
  judgementsMarkers: Uint8Array[]; // Hj
  // todo: section 5 says it's a 32 byte hash
  // but later Hk E Nv. so its a natural number
  blockAuthorKey: number;
  entropySignature: Uint8Array; // Hv
  /**
   * The signature of the block. Must be signed by the validator associated to this time slot.
   */
  blockSeal?: Uint8Array; // Hs
}

export * from "./JamBlock.js";
