import {
  Beta,
  Dagger,
  EG_Extrinsic,
  HeaderHash,
  Posterior,
  STF,
  StateRootHash,
} from "@tsjam/types";
import { MMRSuperPeak } from "@tsjam/merklization";
import { RecentHistory } from "@tsjam/types";
import { RECENT_HISTORY_LENGTH } from "@tsjam/constants";
import { ok } from "neverthrow";

/**
 * $(0.6.7 - 7.8 / 4.17)
 */
export const recentHistoryToPosterior: STF<
  Dagger<RecentHistory>,
  {
    headerHash: HeaderHash; // h
    beta_b_prime: Posterior<Beta["beefyBelt"]>;
    eg: EG_Extrinsic;
  },
  never,
  Posterior<RecentHistory>
> = (input, curState) => {
  const toRet = curState.slice();
  const b = MMRSuperPeak(input.beta_b_prime);
  const p = new Map(
    input.eg
      .map((a) => a.workReport)
      .flat()
      .map((a) => a.workPackageSpecification)
      .flat()
      .map((a) => [a.workPackageHash, a.segmentRoot]),
  );
  toRet.push({
    accumulationResultMMB: b,
    headerHash: input.headerHash,
    stateRoot: 0n as StateRootHash,
    reportedPackages: p,
  });

  if (toRet.length > RECENT_HISTORY_LENGTH) {
    return ok(
      toRet.slice(
        toRet.length - RECENT_HISTORY_LENGTH,
      ) as Posterior<RecentHistory>,
    );
  }
  return ok(toRet as Posterior<RecentHistory>);
};
