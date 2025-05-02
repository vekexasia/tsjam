import { InvokedTransfers } from "@tsjam/pvm";
import { Dagger, Delta, DoubleDagger, STF } from "@tsjam/types";
import { ok } from "neverthrow";

/**
 * $(0.6.4 - 12.28)
 */
export const deltaToDoubleDagger: STF<
  Dagger<Delta>,
  { bold_x: InvokedTransfers },
  never,
  DoubleDagger<Delta>
> = (input, curState) => {
  const dd_delta: Delta = new Map();
  for (const [serviceIndex] of curState) {
    dd_delta.set(serviceIndex, input.bold_x.get(serviceIndex)![0]);
  }
  return ok(dd_delta as DoubleDagger<Delta>);
};
