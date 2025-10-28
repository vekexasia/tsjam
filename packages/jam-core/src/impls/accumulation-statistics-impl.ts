import {
  AccumulationStatistics,
  Gas,
  GasUsed,
  ServiceIndex,
  u32,
} from "@tsjam/types";
import type { AccumulatableWorkReports } from "./work-report-impl";
import { ConditionalExcept } from "type-fest";

/**
 * $(0.7.1 - 12.26) | S
 */
export class AccumulationStatisticsImpl implements AccumulationStatistics {
  elements!: Map<
    ServiceIndex,
    {
      gasUsed: Gas;
      count: u32;
    }
  >;
  constructor(
    config?: ConditionalExcept<AccumulationStatisticsImpl, Function>,
  ) {
    if (config) {
      Object.assign(this, config);
    } else {
      this.elements = new Map();
    }
  }

  has(serviceIndex: ServiceIndex): boolean {
    return this.elements.has(serviceIndex);
  }

  get(serviceIndex: ServiceIndex) {
    return this.elements.get(serviceIndex);
  }

  services(): ServiceIndex[] {
    return Array.from(this.elements.keys());
  }

  static compute(deps: {
    r_star: AccumulatableWorkReports;
    nAccumulatedWork: number;
    /**
     * *bold_u*
     */
    gasUsed: GasUsed;
  }): AccumulationStatisticsImpl {
    const toRet = new AccumulationStatisticsImpl();
    toRet.elements = new Map();
    // $(0.7.2 - 12.29) | we compute the summary of gas used first
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
    for (const [serviceIndex, el] of toRet.elements) {
      // $(0.7.2 - 12.29)
      const n_s = slicedR
        .map((wr) => wr.digests)
        .flat()
        .filter((r) => r.serviceIndex === serviceIndex);
      el.count = <u32>n_s.length;
      // N(S) && G(S) empty
      if (el.count === 0 && el.gasUsed === 0n) {
        toRet.elements.delete(serviceIndex);
      }
    }
    return toRet;
  }
}
