import {
  ArrayOfJSONCodec,
  BandersnatchCodec,
  BandersnatchKeyJSONCodec,
  bandersnatchSignatureCodec,
  BaseJamCodecable,
  createCodec,
  createJSONCodec,
  createSequenceCodec,
  Ed25519PubkeyCodec,
  Ed25519PublicKeyJSONCodec,
  eSubIntCodec,
  hashCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  optionalCodec,
  sequenceCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  BandersnatchKey,
  BandersnatchSignature,
  Blake2bHash,
  ED25519PublicKey,
  EpochMarker,
  Hash,
  HeaderHash,
  JamHeader,
  SeqOfLength,
  SignedJamHeader,
  StateRootHash,
  Tau,
  ValidatorIndex,
} from "@tsjam/types";
import { TicketImpl } from "./TicketImpl";

@JamCodecable()
export class EpochMarkerImpl extends BaseJamCodecable implements EpochMarker {
  @hashCodec()
  entropy!: Blake2bHash;

  @hashCodec("tickets_entropy")
  entropy2!: Blake2bHash;
  @sequenceCodec(NUMBER_OF_VALIDATORS, <any>{
    ...createCodec([
      ["bandersnatch", BandersnatchCodec],
      ["ed25519", Ed25519PubkeyCodec],
    ]),
    ...createJSONCodec<any>([
      ["bandersnatch", "bandersnatch", BandersnatchKeyJSONCodec],
      ["ed25519", "ed25519", Ed25519PublicKeyJSONCodec],
    ]),
  })
  validators!: SeqOfLength<
    {
      bandersnatch: BandersnatchKey;
      ed25519: ED25519PublicKey;
    },
    typeof NUMBER_OF_VALIDATORS,
    "validators"
  >;
}

@JamCodecable()
export class JamHeaderImpl extends BaseJamCodecable implements JamHeader {
  /**
   * **HP:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  @hashCodec()
  parent!: HeaderHash;

  /**
   * **HR:** The hash of the state root.
   * It's computed by applying the `Mσ` fn to the `σ`
   * @see JamState
   */
  @hashCodec("parent_state_root")
  parentStateRoot!: StateRootHash;

  /**
   * **HX:** The hash of the block's extrinsic data.
   */
  @hashCodec("extrinsic_hash")
  extrinsicHash!: Hash;

  /**
   * **HT:** The block's time slot index since jam epoch (time slot is 6 secs long).
   */
  @eSubIntCodec(4)
  slot!: Tau;

  /**
   * **He:** The epoch marker of the block.
   * it basically contains the epoch-length bandersnatch keys in case next epoch is in fallback mode
   * hence the length of kb or validatorKeys is `epoch-length`
   * $(0.7.0 - 5.10)
   */
  @optionalCodec(EpochMarkerImpl, "epoch_mark")
  epochMarker?: EpochMarkerImpl;
  /**
   * `HW` - The winning tickets of the block.
   * set on after end of the lottery
   * and the lottery accumulator (gamma_a) is saturated (epoch-length)
   * and we're not changing epoch
   */
  @optionalCodec(
    <any>{
      ...createSequenceCodec(EPOCH_LENGTH, TicketImpl),
      ...ArrayOfJSONCodec(TicketImpl),
    },
    "tickets_mark",
  )
  ticketsMark?: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>;
  /**
   * `HO`
   * @see DisputesState.psi_w
   * @see DisputesState.psi_b
   */
  @lengthDiscriminatedCodec(
    {
      ...Ed25519PubkeyCodec,
      ...Ed25519PublicKeyJSONCodec,
    },
    "offenders_mark",
  )
  offendersMark!: ED25519PublicKey[];

  /**
   * `HI`
   */
  @eSubIntCodec(2, "author_index")
  authorIndex!: ValidatorIndex;

  /**
   * `HV` -
   */
  @bandersnatchSignatureCodec("entropy_source")
  entropySource!: BandersnatchSignature;
}

@JamCodecable()
export class JamSignedHeaderImpl
  extends JamHeaderImpl
  implements SignedJamHeader
{
  @bandersnatchSignatureCodec()
  seal!: BandersnatchSignature;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("JamSignedHeaderImpl", () => {
    it("header_0.bin", () => {
      const bin = getCodecFixtureFile("header_0.bin");
      const { value: header } =
        JamSignedHeaderImpl.decode<JamSignedHeaderImpl>(bin);
      console.log(header.toJSON(), "a");
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("header_0.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("header_0.json")).toString("utf8"),
      );
      const eg: JamSignedHeaderImpl = JamSignedHeaderImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
    it("header_1.bin", () => {
      const bin = getCodecFixtureFile("header_1.bin");
      const { value: header } =
        JamSignedHeaderImpl.decode<JamSignedHeaderImpl>(bin);
      console.log(header.toJSON(), "a");
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("header_1.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("header_1.json")).toString("utf8"),
      );
      const eg: JamSignedHeaderImpl = JamSignedHeaderImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
