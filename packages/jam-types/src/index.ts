// H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)
import {
  BandersnatchKey,
  BandersnatchSignature,
  ED25519Signature,
  Hash,
  MerkeTreeRoot,
  OpaqueHash,
  SeqOfLength,
  Tagged,
  u32,
} from "@/genericTypes.js";
import { EPOCH_LENGTH } from "@/consts.js";

export type TicketIdentifier = {
  /**
   * `y`
   */
  id: OpaqueHash;
  /**
   * `r`
   * either the first entry or the second entry ( a validator can have only 2 ticket entries per epoch )
   */
  attempt: 0 | 1;
};

export interface JamHeader {
  /**
   * **Hp:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  previousHash: Hash;
  /**
   * **Hr:** The hash of the state root.
   */
  priorStateRoot: MerkeTreeRoot; // Hr
  /**
   * **Hx:** The hash of the block's extrinsic data.
   */
  extrinsicHash: Hash;
  /**
   * **Ht:** The block's time slot index since jam epoch (time slot is 6 secs long).
   */
  timeSlotIndex: number; // Ht
  /**
   * **He:** The epoch marker of the block.
   * it basically contains the epoch-length bandersnatch keys in case next epoch is in fallback mode
   * hence the length of kb or validatorKeys is `epoch-length`
   * @see section 5.1
   */
  epochMarker?: {
    // 4 byte see (65) on section 6.5
    // coming from eta
    entropy: u32;
    // 32 byte bandersnatch sequence (ordered) coming from gamma_k
    validatorKeys: Tagged<
      BandersnatchKey[],
      "validatorKeys",
      { length: "epoch-length" }
    >;
  };

  // set on after end of the lottery
  // and the lottery accumulator (gamma_a) is saturated (epoch-length)
  // and we're not changing epoch
  winningTickets?: SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH>; // Hw
  // section 10
  // must contain exactly the sequence of report hashes of only bad and wonky verdicts
  // does not nneed to be included in the serialization. this is here for convenience
  // but it's just the result of other variables
  /**
   * @see DisputesState.psi_w
   * @see DisputesState.psi_b
   */
  judgementsMarkers: Hash[]; // Hj
  // todo: section 5 says it's a 32 byte hash
  // but later Hk E Nv. so its a natural number
  blockAuthorKey: number; // < V or < number of validators
  entropySignature: ED25519Signature; // Hv
}

export interface SignedJamHeader extends JamHeader {
  /**
   * The signature of the block. Must be signed by the validator associated to this time slot.
   * da
   */
  blockSeal: BandersnatchSignature; // Hs
}

export * from "./JamBlock.js";
export * from "./genericTypes.js";
export * from "./ValidatorData.js";
export * from "./consts.js";
export * from "./ReportingAndAvailabilityState.js";
export * from "./workItem.js";
export * from "./workPackage.js";
export * from "./Ticket.js";
