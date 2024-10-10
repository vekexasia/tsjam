import {
  AccumulationHistory,
  AccumulationQueue,
  AvailableNoPrereqWorkReports,
  AvailableWithPrereqWorkReports,
  AvailableWorkReports,
  Dagger,
  EA_Extrinsic,
  RHO,
  WorkPackageHash,
  WorkReport,
} from "@tsjam/types";
import { CORES, MINIMUM_VALIDATORS } from "@tsjam/constants";
import { toTagged } from "@tsjam/utils";

/**
 * (130) `W` in the paper section
 * 11.2.2
 * @param ea - Availability Extrinsic
 * @param d_rho - dagger rho
 */
export const availableReports = (
  ea: EA_Extrinsic,
  d_rho: Dagger<RHO>,
): AvailableWorkReports => {
  const W: WorkReport[] = [];
  for (let c = 0; c < CORES; c++) {
    const sum = ea.reduce((acc, curr) => {
      return acc + curr.bitstring[c];
    }, 0);
    if (sum > MINIMUM_VALIDATORS) {
      W.push(d_rho[c]!.workReport);
    }
  }
  return toTagged(W);
};

/**
 * Computes  `W!` in the paper
 */
export const noPrereqAvailableReports = (
  w: AvailableWorkReports,
): AvailableNoPrereqWorkReports => {
  return toTagged(
    w.filter(
      (wr) =>
        typeof wr.refinementContext.requiredWorkPackage === "undefined" &&
        wr.segmentRootLookup.size === 0,
    ),
  );
};

/**
 * Computes the union of the AccumulationHistory
 * (159)
 */
export const accHistoryUnion = (
  accHistory: AccumulationHistory,
): AccumulationHistory[0] => {
  return new Map(accHistory.map((a) => [...a.entries()]).flat());
};

const E_Fn = (
  r: AccumulationQueue[0],
  x: AccumulationHistory[0],
): AccumulationQueue[0] => {
  const keys = new Set(x.keys());
  const filteredR = r
    .filter(
      (r) => !keys.has(r.workReport.workPackageSpecification.workPackageHash),
    )
    .filter((r) => {
      const xwl = new Map([
        ...x.entries(),
        ...r.workReport.segmentRootLookup.entries(),
      ]);
      const wlx = new Map([
        ...r.workReport.segmentRootLookup.entries(),
        ...x.entries(),
      ]);

      // check they're the same
      for (const [k, v] of xwl.entries()) {
        if (wlx.get(k) !== v) {
          return false;
        }
      }
      return true;
    });

  const toRet: AccumulationQueue[0] = [];
  for (const { workReport, dependencies } of filteredR) {
    const newDeps = new Set(dependencies);
    workReport.workPackageSpecification.workPackageHash;
    keys.forEach((a) => newDeps.delete(a));
    toRet.push({ workReport, dependencies: newDeps });
  }
  return toRet;
};

export const withPrereqAvailableReports = (
  w: AvailableWorkReports,
  accHistory: AccumulationHistory,
): AvailableWithPrereqWorkReports => {
  return toTagged(
    w.map((wr) => {
      const deps: WorkPackageHash[] = [];
      if (typeof wr.refinementContext.requiredWorkPackage !== "undefined") {
        deps.push(wr.refinementContext.requiredWorkPackage);
      }

      // TODO: use E_Fn
      return {
        workReport: wr,
        dependencies: deps,
      };
    }),
  );
};
