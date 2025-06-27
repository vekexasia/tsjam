import { ED25519PublicKey, Hash } from "@/genericTypes";

/**
 * `X`
 * $(0.7.0 - 10.1)
 */
export interface IDisputesState {
  /**
   * the set of hash of work reports
   * that were judged to be **valid**.
   */
  good: Set<Hash>;

  /**
   * the set of hash of work reports
   * that were judged to be **bad.**
   * bad means that the extrinsic had a verdict with 2/3+1 validators saying the validity was 0
   */
  bad: Set<Hash>;

  /**
   * set of work reports judged to be wonky or impossible to judge
   */
  wonky: Set<Hash>;

  /**
   * set of validator keys found to have misjudged a work report
   * aka: they voted for a work report to be valid when it was not (in psi_b) or vice versa
   */
  offenders: Set<ED25519PublicKey["bigint"]>;
}
