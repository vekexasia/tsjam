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
import { E_Fn } from "@tsjam/pvm";

// (12.27 - 0.5.0)
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
