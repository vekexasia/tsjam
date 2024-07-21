import {
  BandersnatchKey,
  BLSKey,
  ByteArrayOfLength,
  ED25519PublicKey,
} from "@/genericTypes.js";

/**
 * 336 octects
 * K ≡ Y336
 */
export interface ValidatorKey {
  /**
   * kb: validator key k.
   * equivalent to the first 32 octects
   * ∀k ∈ K ∶ kb ∈ HB ≡ k0⋅⋅⋅+32
   */
  banderSnatch: BandersnatchKey;
  /**
   * ke: validator key ed25519.
   * the next 32 octects
   * ∀k ∈ K ∶ ke ∈ HE ≡ k32⋅⋅⋅+32
   */
  ed25519: ED25519PublicKey;
  /**
   * kbls: validator key bls.
   * equivalent to the following 144 octects
   */
  blsKey: BLSKey;
  /**
   * km: validator key bls.
   * 128 octects
   */
  metadata: ByteArrayOfLength<128>;
}
