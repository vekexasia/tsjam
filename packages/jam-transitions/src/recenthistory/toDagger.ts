import { Dagger, JamHeader } from "@tsjam/types";
import { RecentHistory } from "@tsjam/types";
import { newSTF } from "@tsjam/utils";

/**
 * (82) - 0.4.5
 */
export const recentHistoryToDagger = newSTF<
  RecentHistory,
  { hr: JamHeader["priorStateRoot"] },
  Dagger<RecentHistory>
>((input, curState) => {
  if (curState.length === 0) {
    return curState as Dagger<RecentHistory>;
  }
  const toRet = curState.slice();
  toRet[toRet.length - 1].stateRoot = input.hr;
  return toRet as Dagger<RecentHistory>;
});
