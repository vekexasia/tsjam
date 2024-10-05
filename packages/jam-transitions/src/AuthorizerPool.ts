import {
  AuthorizerPool,
  AuthorizerQueue,
  CoreIndex,
  EG_Extrinsic,
  Hash,
  Posterior,
  Tau,
  Validated,
} from "@tsjam/types";
import { newSTF } from "@tsjam/utils";
import { AUTHPOOL_SIZE, AUTHQUEUE_MAX_SIZE } from "@tsjam/constants";

type Input = {
  p_queue: Posterior<AuthorizerQueue>;
  eg: Validated<EG_Extrinsic>;
  p_pool: Posterior<AuthorizerQueue>;
  p_tau: Posterior<Tau>;
};
// (85) and (86)
export const alphaSTF = newSTF<AuthorizerPool, Input>(
  (input: Input, curState: AuthorizerPool): Posterior<AuthorizerPool> => {
    const newState = [];
    for (let core: CoreIndex = 0 as CoreIndex; core < curState.length; core++) {
      const fromPool = input.p_pool[core][input.p_tau % AUTHQUEUE_MAX_SIZE];
      let hashes: Hash[];
      const firstWReport = input.eg.find(
        (w) => w.workReport.coreIndex === core,
      );
      if (typeof firstWReport === "undefined") {
        hashes = [...curState[core], fromPool];
      } else {
        // F(c) says we need to remove the leftmost workReport.hash from the curState
        const h = firstWReport.workReport.authorizerHash;
        const index = curState[core].findIndex((hash) => hash === h);
        hashes = [
          ...curState[core].slice(0, index),
          ...curState[core].slice(index + 1),
          fromPool,
        ];
      }
      newState.push(hashes.reverse().slice(0, AUTHPOOL_SIZE).reverse());
    }
    return curState as Posterior<AuthorizerPool>;
  },
);
