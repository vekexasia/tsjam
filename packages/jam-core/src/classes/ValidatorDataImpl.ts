import {
  bandersnatchCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  ed25519PubkeyCodec,
  fixedSizeIdentityCodec,
  JamCodecable,
  jsonCodec,
} from "@tsjam/codec";
import {
  BandersnatchKey,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
  ValidatorData,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

@JamCodecable()
export class ValidatorDataImpl
  extends BaseJamCodecable
  implements ValidatorData
{
  /**
   * kb: validator key k.
   * equivalent to the first 32 octects
   * ∀k ∈ K ∶ kb ∈ HB ≡ k0⋅⋅⋅+32
   * $(0.7.0 - 6.9)
   */
  @bandersnatchCodec()
  banderSnatch!: BandersnatchKey;

  /**
   * ke: validator key ed25519.
   * the next 32 octects
   * ∀k ∈ K ∶ ke ∈ HE ≡ k32⋅⋅⋅+32
   * $(0.7.0 - 6.10)
   */
  @ed25519PubkeyCodec()
  ed25519!: ED25519PublicKey;

  /**
   * kbls: validator key bls.
   * equivalent to the following 144 octects
   * $(0.7.0 - 6.11)
   */

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(fixedSizeIdentityCodec(144))
  blsKey!: BLSKey;

  /**
   * km: validator key bls.
   * 128 octects
   * first 16 bytes: ipv6 address
   * next 2 bytes: LE encoded port
   * $(0.7.0 - 6.11)
   */

  @jsonCodec(BufferJSONCodec())
  @binaryCodec(fixedSizeIdentityCodec(128))
  metadata!: ByteArrayOfLength<128>;

  constructor(config: ConditionalExcept<ValidatorDataImpl, Function>) {
    super();
    Object.assign(this, config);
  }
}
