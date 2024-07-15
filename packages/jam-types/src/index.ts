// H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)

export interface JamHeader {
  previousHash: string; // Hp
  priorStateRoot: string; // Hr
  exstrinsicHash: string; // Hx
  timeSlotIndex: number; // Ht
  epoch: number; // He
  winningTicket: string; // Hw
  judgementsMarkers: string; // Hj
  blockAuthorKey: string; // Hk Bandersnatch
  entropySignature: string; // Hv
  blockSeal: string; // Hs
}
