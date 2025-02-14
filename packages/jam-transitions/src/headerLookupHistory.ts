import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";
import { toPosterior } from "@tsjam/utils";
import { HeaderHash, HeaderLookupHistory, JamHeader, STF } from "@tsjam/types";
import { ok } from "neverthrow";

/**
 * Computes state transition for disputes state
 */
export const headerLookupHistorySTF: STF<
  HeaderLookupHistory,
  {
    header: JamHeader;
    headerHash: HeaderHash;
  },
  never
> = (input, curState) => {
  const newState = new Map(curState.entries());
  newState.set(input.header.timeSlotIndex, {
    header: input.header,
    hash: input.headerHash,
  });
  const k = [...curState.keys()];
  if (k.length > MAXIMUM_AGE_LOOKUP_ANCHOR) {
    k.sort((a, b) => a - b);
    // we assume it's being called at each block
    newState.delete(k[0]);
  }
  return ok(toPosterior(newState));
};
