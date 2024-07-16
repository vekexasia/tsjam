/**
 * 336 octects
 * K ≡ Y336
 */
export class ValidatorKey {
  /**
   * kb: validator key k.
   * equivalent to the first 32 octects
   * ∀k ∈ K ∶ kb ∈ HB ≡ k0⋅⋅⋅+32
   */
  public banderSnatch: never;
  /**
   * ke: validator key ed25519.
   * the next 32 octects
   * ∀k ∈ K ∶ ke ∈ HE ≡ k32⋅⋅⋅+32
   */
  public ed25519: never;
  /**
   * kbls: validator key bls.
   * equivalent to the following 144 octects
   */
  public blsKey: never;
  /**
   * km: validator key bls.
   * 128 octects
   */
  public metadata: never;
}
