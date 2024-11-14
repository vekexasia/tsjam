import { toPosterior } from "@tsjam/utils";
import {
  AccumulationHistory,
  AccumulationQueue,
  AvailableWithPrereqWorkReports,
  Posterior,
  STF,
  Tau,
} from "@tsjam/types";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { ok } from "neverthrow";

export const accumulationQueueToPosterior: STF<
  AccumulationQueue,
  {
    p_accHistory: Posterior<AccumulationHistory>;
    tau: Tau;
    p_tau: Posterior<Tau>;
    w_q: AvailableWithPrereqWorkReports;
  },
  never
> = (input, curState) => {
  const m = input.tau % EPOCH_LENGTH;

  const toRet = [...curState] as unknown as Posterior<AccumulationQueue>;
  for (let i = 0; i < EPOCH_LENGTH; i++) {
    const index = (m - i + EPOCH_LENGTH) % EPOCH_LENGTH;
    if (i === 0) {
      toRet[index] = toPosterior(
        E_Fn(input.w_q, input.p_accHistory[EPOCH_LENGTH - 1]),
      );
    } else if (i < input.p_tau - input.tau) {
      toRet[index] = toPosterior([]);
    } else {
      toRet[index] = toPosterior(
        E_Fn(toRet[index], input.p_accHistory[EPOCH_LENGTH - 1]),
      );
    }
  }
  return ok(toRet);
};

/**
 * NOTE: this is duplicated from pvm
 */
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
