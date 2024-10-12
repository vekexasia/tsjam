import { newSTF, toPosterior } from "@tsjam/utils";
import { AuthorizerQueue, Posterior } from "@tsjam/types";
import { accumulateInvocation } from "@tsjam/pvm";

// 164 of gp
// `φ' = A(Xa)c` (84)
export const authorizerQueue_toPosterior = newSTF<
  AuthorizerQueue,
  ReturnType<typeof accumulateInvocation>
>((i): Posterior<AuthorizerQueue> => {
  return toPosterior(i[0].authQueue);
});
