import { Posterior, Validated, WorkPackageHash } from "@tsjam/types";
import { AccumulationHistoryImpl } from "./accumulation-history-impl";
import {
  AccumulationQueueImpl,
  AccumulationQueueItem,
} from "./accumulation-queue-impl";
import { TauImpl } from "./slot-impl";
import { AccumulatableWorkReports, WorkReportImpl } from "./work-report-impl";

/**
 * `bold R`
 * $(0.7.1 - 11.16)
 */
export class NewWorkReportsImpl {
  elements: WorkReportImpl[] = [];

  /**
   * `bold R!` in the paper
   * $(0.7.1 - 12.4)
   */
  immediatelyAccumulable() {
    return this.elements.filter(
      (r) => r.context.prerequisites.length === 0 && r.srLookup.size == 0,
    );
  }

  /**
   * `bold RQ` in the paper
   * $(0.7.1 - 12.5)
   */
  queueable(accHistory: AccumulationHistoryImpl) {
    return E_Fn(
      this.elements
        .filter((wr) => {
          return wr.context.prerequisites.length > 0 || wr.srLookup.size > 0;
        })
        .map((wr) => {
          // $(0.7.1 - 12.6) | D fn calculated inline
          const deps = new Set<WorkPackageHash>(wr.srLookup.keys());
          wr.context.prerequisites.forEach((rwp) => deps.add(rwp));
          return new AccumulationQueueItem({
            workReport: wr,
            dependencies: deps,
          });
        }),
      accHistory.union(),
    );
  }

  /**
   * `bold R*` in the paper
   * $(0.7.1 - 12.11)
   */
  accumulatableReports(deps: {
    accHistory: AccumulationHistoryImpl;
    accQueue: AccumulationQueueImpl;
    p_tau: Validated<Posterior<TauImpl>>;
  }) {
    const r_mark = this.immediatelyAccumulable();
    const r_q = this.queueable(deps.accHistory);

    // $(0.7.1 - 12.10)
    const m = deps.p_tau.slotPhase();

    const accprio = computeAccumulationPriority(
      // $(0.7.1 - 12.12)
      E_Fn(
        [
          ...deps.accQueue.elements.slice(m).flat(),
          ...deps.accQueue.elements.slice(0, m).flat(),
          ...r_q,
        ],
        WorkReportImpl.extractWorkPackageHashes(r_mark),
      ),
    );
    return [...r_mark, ...accprio] as AccumulatableWorkReports;
  }
}

/**
 * $(0.7.1 - 12.7)
 */
export const E_Fn = (
  r: AccumulationQueueItem[],
  x: Set<WorkPackageHash>,
): AccumulationQueueItem[] => {
  const toRet: AccumulationQueueItem[] = [];

  for (const { workReport /* w */, dependencies /* d */ } of r) {
    if (x.has(workReport.avSpec.packageHash)) {
      continue;
    }

    const newDeps = new Set(dependencies);
    x.forEach((packageHash) => newDeps.delete(packageHash));
    toRet.push(
      new AccumulationQueueItem({ workReport, dependencies: newDeps }),
    );
  }
  return toRet;
};

/**
 * `Q` fn
 * $(0.7.1 - 12.8)
 */
const computeAccumulationPriority = (
  r: AccumulationQueueItem[],
): WorkReportImpl[] => {
  const g = r
    .filter(({ dependencies }) => dependencies.size === 0)
    .map(({ workReport }) => workReport);
  if (g.length === 0) {
    return [];
  }

  return [
    ...g,
    ...computeAccumulationPriority(
      E_Fn(r, WorkReportImpl.extractWorkPackageHashes(g)),
    ),
  ];
};
