import { newSTF } from "@vekexasia/jam-utils";
import { AuthorizerQueue, Posterior } from "@vekexasia/jam-types";
import { accumulateInvocation } from "@vekexasia/jam-pvm";

// 164 of gp
// `φ' = A(Xa)c` (84)
export const authorizerQueueSTF = newSTF<
  AuthorizerQueue,
  ReturnType<typeof accumulateInvocation>
>((i): Posterior<AuthorizerQueue> => {
  return i.c as Posterior<AuthorizerQueue>;
});
