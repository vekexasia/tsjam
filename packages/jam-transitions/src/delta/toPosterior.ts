import { transferInvocation } from "@tsjam/pvm";
import {
  DeferredTransfer,
  Delta,
  DoubleDagger,
  Posterior,
  ServiceIndex,
} from "@tsjam/types";
import { newSTF, toPosterior } from "@tsjam/utils";

// (180)
export const deltaToPosterior = newSTF<
  DoubleDagger<Delta>,
  { bold_t: DeferredTransfer[] }, // As of (177)
  Posterior<Delta>
>((input, curState) => {
  const R = (d: ServiceIndex) => {
    return input.bold_t
      .slice()
      .sort((a, b) => {
        if (a.sender === b.sender) {
          return a.destination - b.destination;
        }
        return a.sender - b.sender;
      })
      .filter((t) => t.destination === d);
  };

  const p_delta: Delta = new Map();

  [...curState.keys()].forEach((service) => {
    const x = transferInvocation(curState, service, R(service));
    p_delta.set(service, x);
  });

  return toPosterior(p_delta);
});
