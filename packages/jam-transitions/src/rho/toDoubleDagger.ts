import {
  AssuranceExtrinsic,
  Dagger,
  DoubleDagger,
  EA_Extrinsic,
  JamHeader,
  JamState,
  Posterior,
  RHO,
  STF,
  Validated,
  Tau,
} from "@tsjam/types";
import { CORES, NUMBER_OF_VALIDATORS, WORK_TIMEOUT } from "@tsjam/constants";
import { ok } from "neverthrow";

/**
 * converts Dagger<RHO> to DoubleDagger<RHO>
 * $(0.5.2 - 11.18)
 */
export const RHO2DoubleDagger: STF<
  Dagger<RHO>,
  {
    ea: Validated<EA_Extrinsic>;
    p_kappa: Posterior<JamState["kappa"]>;
    hp: JamHeader["parent"];
    p_tau: Posterior<Tau>;
  },
  never,
  DoubleDagger<RHO>
> = (input, curState) => {
  const newState = [...curState] as DoubleDagger<RHO>;
  for (let i = 0; i < CORES; i++) {
    // recomputing bold W
    const availabilitySum = input.ea.reduce(
      (a: number, b: AssuranceExtrinsic) => a + b.bitstring[i],
      0,
    );
    if (availabilitySum > (NUMBER_OF_VALIDATORS * 2) / 3) {
      newState[i] = undefined;
    }
    if (curState[i] && input.p_tau >= curState[i]!.reportTime + WORK_TIMEOUT) {
      newState[i] = undefined;
    }
  }
  return ok(newState);
};
