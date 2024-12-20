import { transferInvocation } from "@tsjam/pvm";
import {
  Dagger,
  DeferredTransfer,
  Delta,
  DoubleDagger,
  Posterior,
  STF,
  ServiceIndex,
  Tau,
} from "@tsjam/types";
import { ok } from "neverthrow";

/**
 * $(0.5.3 - 12.24)
 */
export const deltaToDoubleDagger: STF<
  Dagger<Delta>,
  { transfers: DeferredTransfer[]; p_tau: Posterior<Tau> },
  never,
  DoubleDagger<Delta>
> = (input, curState) => {
  const dd_delta: Delta = new Map();
  for (const [serviceIndex] of curState) {
    dd_delta.set(
      serviceIndex,
      transferInvocation(
        curState,
        input.p_tau,
        serviceIndex,
        R_fn(input.transfers, serviceIndex),
      ),
    );
  }
  return ok(dd_delta as DoubleDagger<Delta>);
};

/**
 * $(0.5.3 - 12.23)
 */
const R_fn = (t: DeferredTransfer[], destination: ServiceIndex) => {
  return t
    .slice()
    .sort((a, b) => {
      if (a.sender === b.sender) {
        return a.destination - b.destination;
      }
      return a.sender - b.sender;
    })
    .filter((t) => t.destination === destination);
};
