import {
  AccumulationStatistics,
  Gas,
  GasUsed,
  ServiceIndex,
  u32,
} from "@tsjam/types";
import { AccumulatableWorkReports } from "./WorkReportImpl";

/**
 * $(0.7.0 - 12.26) | S
 */
export class AccumulationStatisticsImpl implements AccumulationStatistics {
  elements!: Map<
    ServiceIndex,
    {
      gasUsed: Gas;
      count: u32;
    }
  >;

  has(serviceIndex: ServiceIndex): boolean {
    return this.elements.has(serviceIndex);
  }

  services(): ServiceIndex[] {
    return Array.from(this.elements.keys());
  }

  static compute(deps: {
    r_star: AccumulatableWorkReports;
    nAccumulatedWork: number;
    gasUsed: GasUsed;
  }): AccumulationStatisticsImpl {
    const toRet = new AccumulationStatisticsImpl();
    toRet.elements = new Map();
    // $(0.7.0 - 12.27) | we compute the summary of gas used first
    deps.gasUsed.elements.forEach(({ serviceIndex, gasUsed }) => {
      if (!toRet.elements.has(serviceIndex)) {
        toRet.elements.set(serviceIndex, {
          gasUsed: <Gas>0n,
          count: <u32>0,
        });
      }
      const el = toRet.elements.get(serviceIndex)!;
      el.gasUsed = (el.gasUsed + gasUsed) as Gas;
    });

    const slicedR = deps.r_star.slice(0, deps.nAccumulatedWork);
    for (const serviceIndex of toRet.elements.keys()) {
      // $(0.7.0 - 12.27)
      const n_s = slicedR
        .map((wr) => wr.digests)
        .flat()
        .filter((r) => r.serviceIndex === serviceIndex);
      if (n_s.length === 0) {
        // N(s) != []
        toRet.elements.delete(serviceIndex);
      } else {
        toRet.elements.get(serviceIndex)!.count = <u32>n_s.length;
      }
    }
    return toRet;
  }
}
