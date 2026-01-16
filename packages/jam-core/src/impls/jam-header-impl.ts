import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  codec,
  encodeWithCodec,
  eSubIntCodec,
  JamCodecable,
  optionalCodec,
  xBytesCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import type {
  BandersnatchSignature,
  Hash,
  HeaderHash,
  JamHeader,
  StateRootHash,
  ValidatorIndex,
} from "@tsjam/types";
import { HeaderEpochMarkerImpl } from "./header-epoch-marker-impl";
import { HeaderOffenderMarkerImpl } from "./header-offender-marker-impl";
import { HeaderTicketMarkerImpl } from "./header-ticket-marker-impl";
import { SlotImpl, type TauImpl } from "./slot-impl";

/**
 * $(0.7.1 - C.23) | `Eu`
 */
@JamCodecable()
export class JamHeaderImpl extends BaseJamCodecable implements JamHeader {
  /**
   * **HP:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  @codec(HashCodec)
  parent!: HeaderHash;

  /**
   * **HR:** The hash of the state root.
   * It's computed by applying the `Mσ` fn to the `σ`
   * @see JamState
   */
  @codec(HashCodec, "parent_state_root")
  parentStateRoot!: StateRootHash;

  /**
   * **HX:** The hash of the block's extrinsic data.
   */
  @codec(HashCodec, "extrinsic_hash")
  extrinsicHash!: Hash;

  /**
   * **HT:** The block's time slot index since jam epoch (time slot is 6 secs long).
   */
  @codec(SlotImpl)
  slot!: TauImpl;

  /**
   * **He:** The epoch marker of the block.
   * it basically contains the epoch-length bandersnatch keys in case next epoch is in fallback mode
   * hence the length of kb or validatorKeys is `epoch-length`
   *
   */
  @optionalCodec(HeaderEpochMarkerImpl, "epoch_mark")
  epochMarker?: HeaderEpochMarkerImpl;
  /**
   * `HW` - The winning tickets of the block.
   * set on after end of the lottery
   * and the lottery accumulator (gamma_a) is saturated (epoch-length)
   * and we're not changing epoch
   */
  @optionalCodec(HeaderTicketMarkerImpl, "tickets_mark")
  ticketsMark?: HeaderTicketMarkerImpl;

  /**
   * `HI`
   */
  @eSubIntCodec(2, "author_index")
  authorIndex!: ValidatorIndex;

  /**
   * `HV` -
   */
  @codec(xBytesCodec(96), "entropy_source")
  entropySource!: BandersnatchSignature;

  /**
   * `HO`
   * @see DisputesState.psi_w
   * @see DisputesState.psi_b
   */
  @codec(HeaderOffenderMarkerImpl, "offenders_mark")
  offendersMark!: HeaderOffenderMarkerImpl;

  unsignedHash(): HeaderHash {
    return Hashing.blake2b(encodeWithCodec(JamHeaderImpl, this));
  }
}
