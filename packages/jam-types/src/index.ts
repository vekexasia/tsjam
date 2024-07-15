// H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)

export interface JamHeader {
  /**
   * **Hp:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  previousHash: string;
  /**
   * **Hr:** The hash of the state root.
   */
  priorStateRoot: string; // Hr
  /**
   * **Hx:** The hash of the block's extrinsic data.
   */
  extrinsicHash: string;
  /**
   * **Ht:** The block's timestamp.
   */
  timeSlotIndex: number; // Ht
  epoch: number; // He
  winningTicket: string; // Hw
  judgementsMarkers: string; // Hj
  blockAuthorKey: string; // Hk Bandersnatch
  entropySignature: string; // Hv
  blockSeal: string; // Hs
}
