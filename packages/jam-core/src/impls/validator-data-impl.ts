import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  xBytesCodec,
} from "@tsjam/codec";
import type {
  BandersnatchKey,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
  ValidatorData,
} from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

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

  ipv6(): string {
    const ipv6 = Buffer.from(this.metadata.subarray(0, 16));
    const parts = [];
    for (let i = 0; i < 16; i += 2) {
      // NOTE: jam-np does not specify if its BE or LE
      parts.push(ipv6.readUInt16BE(i).toString(16));
    }
    // NOTE: 0000 is not shortened to ::
    return parts.join(":");
  }

  port(): number {
    return Buffer.from(this.metadata.subarray(16, 18)).readUInt16LE(0);
  }

  static newEmpty() {
    return new ValidatorDataImpl({
      banderSnatch: <BandersnatchKey>new Uint8Array(32).fill(0),
      ed25519: <ED25519PublicKey>new Uint8Array(32).fill(0),
      blsKey: <BLSKey>new Uint8Array(144).fill(0),
      metadata: <ByteArrayOfLength<128>>new Uint8Array(128).fill(0),
    });
  }
}
