import { xBytesCodec } from "@/codecs/misc-codecs";
import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
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
   * $(0.7.1 - 6.9)
   */
  @codec(xBytesCodec(32), "bandersnatch")
  banderSnatch!: BandersnatchKey;

  /**
   * ke: validator key ed25519.
   * the next 32 octects
   * ∀k ∈ K ∶ ke ∈ HE ≡ k32⋅⋅⋅+32
   * $(0.7.1 - 6.10)
   */
  @codec(xBytesCodec(32))
  ed25519!: ED25519PublicKey;

  /**
   * kbls: validator key bls.
   * equivalent to the following 144 octects
   * $(0.7.1 - 6.11)
   */

  @codec(xBytesCodec(144), "bls")
  blsKey!: BLSKey;

  /**
   * km: validator key bls.
   * 128 octects
   * first 16 bytes: ipv6 address
   * next 2 bytes: LE encoded port
   * $(0.7.1 - 6.11)
   */
  @codec(xBytesCodec(128))
  metadata!: ByteArrayOfLength<128>;

  constructor(config?: ConditionalExcept<ValidatorDataImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}
