// H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)
import {
  BandersnatchKey,
  BandersnatchSignature,
  Blake2bHash,
  ED25519PublicKey,
  Hash,
  MerkeTreeRoot,
  OpaqueHash,
  SeqOfLength,
  u32,
} from "@/genericTypes.js";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@vekexasia/jam-constants";
import { Tau } from "@/Tau.js";

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
  timeSlotIndex: Tau; // Ht
  /**
   * **He:** The epoch marker of the block.
   * it basically contains the epoch-length bandersnatch keys in case next epoch is in fallback mode
   * hence the length of kb or validatorKeys is `epoch-length`
   * @see section 5.1
   */
  epochMarker?: {
    // 4 byte see (65) on section 6.5
    // coming from eta
    entropy: Blake2bHash;
    // 32 byte bandersnatch sequence (ordered) coming from gamma_k
    validatorKeys: SeqOfLength<
      BandersnatchKey,
      typeof NUMBER_OF_VALIDATORS,
      "validatorKeys"
    >;
  };

  /**
   * `Hw` - The winning tickets of the block.
   * set on after end of the lottery
   * and the lottery accumulator (gamma_a) is saturated (epoch-length)
   * and we're not changing epoch
   */
  winningTickets?: SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH>; // Hw
  /**
   * `Ho`
   * @see DisputesState.psi_w
   * @see DisputesState.psi_b
   */
  offenders: ED25519PublicKey[]; // Ho
  // but later Hi E Nv. so its a natural number
  // < typeof NUMBER_OF_VALIDATORS
  blockAuthorKeyIndex: u32; // < V or < number of validators

  /**
   * `Hv` -
   * @see (62) in section 6.4
   */
  entropySignature: BandersnatchSignature; // Hv
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
export * from "./STF.js";
export * from "./extrinsics/assurances.js";
export * from "./extrinsics/disputes.js";
export * from "./extrinsics/guarantees.js";
export * from "./extrinsics/preimages.js";
export * from "./extrinsics/tickets.js";

export * from "./sets/AvailabilitySpecification.js";
export * from "./sets/ExportSegment.js";
export * from "./sets/RefinementContext.js";
export * from "./sets/ServiceAccount.js";
export * from "./sets/Ticket.js";
export * from "./sets/WorkItem.js";
export * from "./sets/WorkOutput.js";
export * from "./sets/WorkPackage.js";
export * from "./sets/WorkReport.js";
export * from "./sets/WorkResult.js";

export * from "./states/AuthorizerQueue.js";
export * from "./states/AuthorizerPool.js";
export * from "./states/Delta.js";
export * from "./states/DisputesState.js";
export * from "./states/rho.js";
export * from "./states/RecentHistory.js";
export * from "./states/SafroleState.js";

export * from "./pvm/DeferredTransfer.js";
export * from "./pvm/IParsedProgram.js";
export * from "./pvm/PVMProgramExecutionContext.js";
export * from "./pvm/PVMExitReason.js";
export * from "./pvm/PVMFn.js";
export * from "./pvm/PVMIx.js";
export * from "./pvm/IPVMMemory.js";
export * from "./pvm/PVMProgram.js";
export * from "./pvm/PVMResultContext.js";
export * from "./pvm/RegisterIdentifier.js";

export * from "./Tau.js";
export * from "./garantors.js";
