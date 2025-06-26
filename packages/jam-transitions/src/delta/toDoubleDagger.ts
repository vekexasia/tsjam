import { InvokedTransfers } from "@tsjam/pvm";
import {
  Dagger,
  Delta,
  DoubleDagger,
  Gas,
  Posterior,
  ServiceIndex,
  STF,
  Tau,
  u32,
} from "@tsjam/types";
import { ok } from "neverthrow";

/**
 * $(0.6.7 - 12.29)
 */
export const deltaToDoubleDagger: STF<
  Dagger<Delta>,
  {
    bold_x: InvokedTransfers;
    accumulationStatistics: Map<ServiceIndex, { usedGas: Gas; count: u32 }>;
    p_tau: Posterior<Tau>;
  },
  never,
  DoubleDagger<Delta>
> = (input, curState) => {
  const dd_delta: Delta = new Map();
  for (const [serviceIndex] of curState) {
    let a = input.bold_x.get(serviceIndex)![0];
    if (input.accumulationStatistics.has(serviceIndex)) {
      a = structuredClone(a);
      a.lastAcc = input.p_tau;
    }
    dd_delta.set(serviceIndex, a);
  }
  return ok(dd_delta as DoubleDagger<Delta>);
};
