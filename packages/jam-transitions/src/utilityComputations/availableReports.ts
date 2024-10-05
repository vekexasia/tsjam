import { Dagger, EA_Extrinsic, RHO, WorkReport } from "@tsjam/types";
import { CORES, MINIMUM_VALIDATORS } from "@tsjam/constants";

/**
 * (129) `W` in the paper section
 * 11.2.2
 * @param ea - Availability Extrinsic
 * @param d_rho - dagger rho
 */
export const availableReports = (
  ea: EA_Extrinsic,
  d_rho: Dagger<RHO>,
): WorkReport[] => {
  const W: WorkReport[] = [];
  for (let c = 0; c < CORES; c++) {
    const sum = ea.reduce((acc, curr) => {
      return acc + curr.bitstring[c];
    }, 0);
    if (sum > MINIMUM_VALIDATORS) {
      W.push(d_rho[c]!.workReport);
    }
  }
  return W;
};
