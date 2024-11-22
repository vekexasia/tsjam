import { toPosterior } from "@tsjam/utils";
import { STF } from "@tsjam/types";
import { AccumulationHistory, Tagged, Tau, WorkReport } from "@tsjam/types";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { ok } from "neverthrow";
import { P_fn } from "@tsjam/pvm";

/**
 * $(0.5.0 - 12.25 / 12.26)
 *
 */
export const accumulationHistoryToPosterior: STF<
  AccumulationHistory,
  { nAccumulatedWork: number; w_star: Tagged<WorkReport[], "W*">; tau: Tau },
  never
> = (input, curState) => {
  const w_dot_n = input.w_star.slice(0, input.nAccumulatedWork);
  const p_state = curState.slice();
  p_state[EPOCH_LENGTH - 1] = P_fn(w_dot_n);
  for (let i = 0; i < EPOCH_LENGTH - 1; i++) {
    p_state[i] = curState[i + 1];
  }
  return ok(toPosterior(p_state as AccumulationHistory));
};
