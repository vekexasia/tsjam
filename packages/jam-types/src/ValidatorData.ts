import {
  BLSKey,
  BandersnatchKey,
  ByteArrayOfLength,
  ED25519PublicKey,
} from "@/genericTypes.js";

/**
 * 336 octects
 * K ≡ Y336
 * $(0.7.1 - 6.8)
 */
export interface ValidatorData {
  /**
   * kb: validator key k.
   * equivalent to the first 32 octects
   * ∀k ∈ K ∶ kb ∈ HB ≡ k0⋅⋅⋅+32
   * $(0.7.1 - 6.9)
   */
  banderSnatch: BandersnatchKey;
  /**
   * ke: validator key ed25519.
   * the next 32 octects
   * ∀k ∈ K ∶ ke ∈ HE ≡ k32⋅⋅⋅+32
   * $(0.7.1 - 6.10)
   */
  ed25519: ED25519PublicKey;
  /**
   * kbls: validator key bls.
   * equivalent to the following 144 octects
   * $(0.7.1 - 6.11)
   */
  blsKey: BLSKey;
  /**
   * km: validator key bls.
   * 128 octects
   * first 16 bytes: ipv6 address
   * next 2 bytes: LE encoded port
   * $(0.7.1 - 6.11)
   */
  metadata: ByteArrayOfLength<128>;
}
