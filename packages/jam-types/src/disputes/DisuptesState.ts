import { ED25519PublicKey, Hash } from "@/genericTypes.js";

/**
 * Section 10 of graypaper
 */
export interface DisuptesState {
  // good set of work reports judged to be correct
  psi_g: Set<Hash>;
  // bad set of work reports judged to be incorrect
  psi_b: Set<Hash>;
  // set of work reports judged to be wonky or impossible to judge
  psi_w: Set<Hash>;
  // set of validator keys found to have misjudged a work report
  psi_p: Set<ED25519PublicKey>;
}
