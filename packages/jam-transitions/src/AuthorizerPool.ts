import {
  AuthorizerPool,
  AuthorizerQueue,
  CoreIndex,
  EG_Extrinsic,
  Hash,
  Posterior,
  STF,
  Tau,
} from "@tsjam/types";
import { AUTHPOOL_SIZE, AUTHQUEUE_MAX_SIZE } from "@tsjam/constants";
import { Ok, ok } from "neverthrow";

type Input = {
  eg: EG_Extrinsic;
  p_queue: Posterior<AuthorizerQueue>;
  p_tau: Posterior<Tau>;
};

// $(0.6.5 - 8.2 / 8.3)
export const authorizerPool_toPosterior: STF<AuthorizerPool, Input, never> = (
  input: Input,
  curState: AuthorizerPool,
): Ok<Posterior<AuthorizerPool>, never> => {
  const newState = [];

  for (let core: CoreIndex = 0 as CoreIndex; core < curState.length; core++) {
    const fromQueue = input.p_queue[core][input.p_tau % AUTHQUEUE_MAX_SIZE];
    let hashes: Hash[];
    const firstWReport = input.eg.find((w) => w.workReport.coreIndex === core);
    if (typeof firstWReport === "undefined") {
      // F(c) results in queue[c]
      hashes = [...curState[core], fromQueue];
    } else {
      // F(c) says we need to remove the leftmost workReport.hash from the curState
      const h = firstWReport.workReport.authorizerHash;
      const index = curState[core].findIndex((hash) => hash === h);
      hashes = [
        ...curState[core].slice(0, index),
        ...curState[core].slice(index + 1),
        fromQueue,
      ];
    }
    newState.push(hashes.reverse().slice(0, AUTHPOOL_SIZE).reverse());
  }
  return ok(newState as Posterior<AuthorizerPool>);
};
