import { newSTF } from "@tsjam/utils";
import { AuthorizerQueue, Posterior } from "@tsjam/types";
import { accumulateInvocation } from "@tsjam/pvm";

// 164 of gp
// `φ' = A(Xa)c` (84)
export const authorizerQueueSTF = newSTF<
  AuthorizerQueue,
  ReturnType<typeof accumulateInvocation>
>((i): Posterior<AuthorizerQueue> => {
  return i.c as Posterior<AuthorizerQueue>;
});
