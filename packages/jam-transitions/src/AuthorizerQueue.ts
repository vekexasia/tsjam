import { newSTF } from "@vekexasia/jam-utils";
import { AuthorizerQueue, Posterior } from "@vekexasia/jam-types";

// todo: implement the STF
// 164 of gp
// `φ' = A(Xa)c` (84)
export const authorizerQueueSTF = newSTF<AuthorizerQueue, null>((i, s) => {
  return s as Posterior<AuthorizerQueue>;
});
