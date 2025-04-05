import {
  AvailableWorkReports,
  Dagger,
  DoubleDagger,
  Posterior,
  RHO,
  STF,
  Tau,
} from "@tsjam/types";
import { CORES, WORK_TIMEOUT } from "@tsjam/constants";
import { ok } from "neverthrow";

/**
 * converts Dagger<RHO> to DoubleDagger<RHO>
 * $(0.6.4 - 11.17)
 */
export const RHO2DoubleDagger: STF<
  Dagger<RHO>,
  {
    rho: RHO;
    p_tau: Posterior<Tau>; // Ht
    availableReports: AvailableWorkReports;
  },
  never,
  DoubleDagger<RHO>
> = (input, curState) => {
  const newState = [...curState] as DoubleDagger<RHO>;
  for (let c = 0; c < CORES; c++) {
    if (typeof curState[c] === "undefined") {
      continue; // if no  workreport indagger then there is nothing to remove.
    }
    const [w] = input.availableReports.filter((w) => w.coreIndex === c);
    // check if workreport from rho has now become available

    if (
      input.rho[c] &&
      w &&
      input.rho[c]!.workReport.authorizerHash === w.authorizerHash
    ) {
      newState[c] = undefined;
    }

    if (input.p_tau >= curState[c]!.reportTime + WORK_TIMEOUT) {
      newState[c] = undefined;
    }
  }
  return ok(newState);
};
