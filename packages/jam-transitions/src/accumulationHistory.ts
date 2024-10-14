import { newSTF, toPosterior } from "@tsjam/utils";
import { AccumulationHistory, Tagged, Tau, WorkReport } from "@tsjam/types";
import { EPOCH_LENGTH } from "@vekexasia/jam-constants";

export const accumulationHistoryToPosterior = newSTF<
  AccumulationHistory,
  { w_star: Tagged<WorkReport[], "W*">; tau: Tau }
>((input, curState) => {
  //FIXME: wait for clarification
  const n = 0;

  const P_fn = (r: WorkReport[]) => {
    return new Map(
      r.map((wr) => [
        wr.workPackageSpecification.workPackageHash,
        wr.workPackageSpecification.segmentRoot,
      ]),
    );
  };
  //TODO: (180) says we
  const w_dot_n = input.w_star.slice(0, n);
  const p_state = curState.slice();
  p_state[EPOCH_LENGTH - 1] = P_fn(w_dot_n);
  for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
    p_state[i] = curState[i + 1];
  }
  return toPosterior(p_state as AccumulationHistory);
});
