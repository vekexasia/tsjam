import { Dagger, JamHeader } from "@tsjam/types";
import { ok } from "neverthrow";
import { STF } from "@tsjam/types";
import { RecentHistory } from "@tsjam/types";

/**
 * $(0.6.7 - 4.6 / 7.5)
 */
export const recentHistoryHToDagger: STF<
  RecentHistory["h"],
  { hr: JamHeader["priorStateRoot"] },
  never,
  Dagger<RecentHistory["h"]>
> = (input, curState) => {
  if (curState.length === 0) {
    return ok(curState as Dagger<RecentHistory["h"]>);
  }
  const toRet = curState.slice();
  toRet[toRet.length - 1] = { ...toRet[toRet.length - 1] };
  toRet[toRet.length - 1].stateRoot = input.hr;
  return ok(toRet as Dagger<RecentHistory["h"]>);
};
