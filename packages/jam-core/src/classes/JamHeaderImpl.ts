import { HashCodec, xBytesCodec } from "@/codecs/miscCodecs";
import {
  ArrayOfJSONCodec,
  BaseJamCodecable,
  codec,
  createSequenceCodec,
  encodeWithCodec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  optionalCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  BandersnatchSignature,
  ED25519PublicKey,
  Hash,
  HeaderHash,
  JamHeader,
  SeqOfLength,
  StateRootHash,
  ValidatorIndex,
} from "@tsjam/types";
import { HeaderEpochMarkerImpl } from "./HeaderEpochMarkerImpl";
import { JamBlockExtrinsicsImpl } from "./JamBlockExtrinsicsImpl";
import { TauImpl } from "./SlotImpl";
import { TicketImpl } from "./TicketImpl";

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
  @eSubIntCodec(4)
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
  @optionalCodec(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <any>{
      ...createSequenceCodec(EPOCH_LENGTH, TicketImpl),
      ...ArrayOfJSONCodec(TicketImpl),
    },
    "tickets_mark",
  )
  ticketsMark?: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>;

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
  @lengthDiscriminatedCodec(xBytesCodec(32), "offenders_mark")
  offendersMark!: ED25519PublicKey[];

  unsignedHash(): HeaderHash {
    return Hashing.blake2b(encodeWithCodec(JamHeaderImpl, this));
  }

  /**
   * $(0.7.1 - 5.4)
   */
  verifyExtrinsicHash(extrinsics: JamBlockExtrinsicsImpl) {
    return this.extrinsicHash === extrinsics.extrinsicHash();
  }
}
