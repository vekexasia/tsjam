import { Dagger, JamHeader, newSTF } from "@vekexasia/jam-types";
import { RecentHistory } from "@/type.js";

export const recentHistoryToDagger = newSTF<
  RecentHistory,
  { hr: JamHeader["priorStateRoot"] },
  Dagger<RecentHistory>
>((input, curState) => {
  const toRet = curState.slice();
  // (81)
  toRet[toRet.length - 1].stateRoot = input.hr;
  return toRet as Dagger<RecentHistory>;
});
