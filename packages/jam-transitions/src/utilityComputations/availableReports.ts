import {
  AccumulationHistory,
  AccumulationQueue,
  AvailableNoPrereqWorkReports,
  AvailableWithPrereqWorkReports,
  AvailableWorkReports,
  Dagger,
  EA_Extrinsic,
  Hash,
  RHO,
  Tau,
  WorkPackageHash,
  WorkReport,
} from "@tsjam/types";
import { CORES, EPOCH_LENGTH, MINIMUM_VALIDATORS } from "@tsjam/constants";
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

/**
 * `WQ` in the paper
 * (162) Section 12.2
 */
export const withPrereqAvailableReports = (
  w: AvailableWorkReports,
  accHistory: Map<WorkPackageHash, Hash>,
): AvailableWithPrereqWorkReports => {
  return toTagged(
    E_Fn(
      w
        .filter((wr) => {
          return (
            typeof wr.refinementContext.requiredWorkPackage !== "undefined" ||
            wr.segmentRootLookup.size > 0
          );
        })
        .map((wr) => {
          const deps = new Set<WorkPackageHash>(wr.segmentRootLookup.keys());
          if (typeof wr.refinementContext.requiredWorkPackage !== "undefined") {
            deps.add(wr.refinementContext.requiredWorkPackage);
          }
          return { workReport: wr, dependencies: deps };
        }),
      new Map(accHistory.map((a) => [...a.entries()]).flat()),
    ),
  );
};
const P_fn = (r: WorkReport[]): Map<WorkPackageHash, Hash> => {
  return new Map(
    r.map((wr) => [
      wr.workPackageSpecification.workPackageHash,
      wr.workPackageSpecification.segmentRoot,
    ]),
  );
};
export const computeAccumulationPriority = (
  r: Array<{ workReport: WorkReport; dependencies: Set<WorkPackageHash> }>,
  a: Map<WorkPackageHash, Hash>,
): WorkReport[] => {
  const g = r
    .filter(({ dependencies }) => dependencies.size() === 0)
    .map(({ workReport }) => workReport);
  if (g.length === 0) {
    return [];
  }
  const pg = P_fn(g);

  return [
    ...g,
    ...computeAccumulationPriority(
      E_Fn(r, pg),
      new Map([...a.entries(), ...pg.entries()]),
    ),
  ];
};

/**
 * `W*` in the paper
 * (168)
 */
export const accumulatableReports = (
  w_mark: ReturnType<typeof noPrereqAvailableReports>,
  w_q: ReturnType<typeof withPrereqAvailableReports>,
  accumulationQueue: AccumulationQueue,
  accHistory: AccumulationHistory,
  tau: Tau, // Ht
) => {
  const m = tau % EPOCH_LENGTH;

  return [
    ...w_mark,
    computeAccumulationPriority(
      [
        ...accumulationQueue.slice(m).flat(),
        ...accumulationQueue.slice(0, m).flat(),
        ...w_q,
      ],
      accHistoryUnion(accHistory),
    ),
  ];
};
