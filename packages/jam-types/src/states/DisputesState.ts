import { ED25519PublicKey, Hash } from "@/genericTypes";

/**
 * Section 10 of graypaper
 * $(0.5.4 - 10.1)
 */
export interface IDisputesState {
  /**
   * the set of hash of work reports
   * that were judged to be **valid**.
   */
  psi_g: Set<Hash>;

  /**
   * the set of hash of work reports
   * that were judged to be **bad.**
   * bad means that the extrinsic had a verdict with 2/3+1 validators saying the validity was 0
   */
  psi_b: Set<Hash>;

  /**
   * set of work reports judged to be wonky or impossible to judge
   */
  psi_w: Set<Hash>;
  /**
   * set of validator keys found to have misjudged a work report
   * aka: they voted for a work report to be valid when it was not (in psi_b) or vice versa
   */
  psi_o: Set<ED25519PublicKey>;
}
