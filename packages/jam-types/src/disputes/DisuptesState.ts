import { ED25519PublicKey, Hash } from "@/genericTypes.js";

/**
 * Section 10 of graypaper
 */
export interface DisuptesState {
  /**
   * the set of hash of work reports
   * that were judged to be **valid**.
   */
  psi_g: Set<Hash>;
  /**
   * the set of hash of work reports
   * that were judged to be **uncertain.**
   */
  psi_b: Set<Hash>;
  /**
   *
   set of work reports judged to be wonky or impossible to judge
   */
  psi_w: Set<Hash>;
  /**
   * set of validator keys found to have misjudged a work report
   */
  psi_p: Set<ED25519PublicKey>;
}