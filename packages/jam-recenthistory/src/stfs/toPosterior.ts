import {
  Dagger,
  Hash,
  JamHeader,
  newSTF,
  Posterior,
} from "@vekexasia/jam-types";
import { RecentHistory } from "@/type.js";

/**
 * see (82) (162) (163)
 */
export const recentHistoryToPosterior = newSTF<
  Dagger<RecentHistory>,
  {
    serviceIndex: number;
    accummulationResult: Hash;
    headerHash: Hash;
    workReports: Hash[];
  },
  Posterior<RecentHistory>
>((input, curState) => {
  const toRet = curState.slice();
  toRet.push({
    accumulationResultMMR: undefined,
    headerHash: input.headerHash,
    stateRoot: undefined,
    workReports: undefined,
  });
  return toRet as Posterior<RecentHistory>;
});
