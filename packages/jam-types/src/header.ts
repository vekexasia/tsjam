import {
  BandersnatchKey,
  BandersnatchSignature,
  Blake2bHash,
  ED25519PublicKey,
  Hash,
  HeaderHash,
  SeqOfLength,
  StateRootHash,
  ValidatorIndex,
} from "@/genericTypes.js";
import { Slot } from "@/Slot.js";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { Ticket } from "./sets/Ticket.js";
/**
 * $(0.7.1 - 5.10)
 */
export interface EpochMarker {
  // coming from eta
  entropy: Blake2bHash;
  entropy2: Blake2bHash;
  // 32 byte bandersnatch sequence (ordered) coming from gamma_k
  validators: SeqOfLength<
    { bandersnatch: BandersnatchKey; ed25519: ED25519PublicKey },
    typeof NUMBER_OF_VALIDATORS,
    "validators"
  >;
}
/**
 * Represents a header of a block in the Jam chain.
 * H ≡ (Hp,Hr,Hx,Ht,He,Hw,Hj,Hk,Hv,Hs)
 * @see $(0.7.1 - 5.1)
 * NOTE: the following are computed values
 * `Ha`= K'[Hi]
 */
export interface JamHeader {
  /**
   * **HP:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  parent: HeaderHash;

  /**
   * **HR:** The hash of the state root.
   * It's computed by applying the `Mσ` fn to the `σ`
   * @see JamState
   */
  parentStateRoot: StateRootHash;

  /**
   * **HX:** The hash of the block's extrinsic data.
   */
  extrinsicHash: Hash;

  /**
   * **HT:** The block's time slot index since jam epoch (time slot is 6 secs long).
   */
  slot: Slot;

  /**
   * **He:** The epoch marker of the block.
   * it basically contains the epoch-length bandersnatch keys in case next epoch is in fallback mode
   * hence the length of kb or validatorKeys is `epoch-length`
   *
   */
  epochMarker?: EpochMarker;

  /**
   * `HW` - The winning tickets of the block.
   * set on after end of the lottery
   * and the lottery accumulator (gamma_a) is saturated (epoch-length)
   * and we're not changing epoch
   */
  ticketsMark?: SeqOfLength<Ticket, typeof EPOCH_LENGTH>;

  /**
   * `HO`
   * @see DisputesState.psi_w
   * @see DisputesState.psi_b
   */
  offendersMark: ED25519PublicKey[];

  /**
   * `HI`
   */
  authorIndex: ValidatorIndex;

  /**
   * `HV` -
   */
  entropySource: BandersnatchSignature;
}

export interface SignedJamHeader extends JamHeader {
  /**
   * `HS`
   * The signature of the block. Must be signed by the validator associated to this time slot.
   */
  seal: BandersnatchSignature;
}
