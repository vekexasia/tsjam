import { isNewEra, toPosterior } from "@tsjam/utils";
import { JamStateImpl } from "./JamStateImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";
import { Posterior, Tau } from "@tsjam/types";
import { JamCodecable } from "@tsjam/codec";

@JamCodecable()
export class KappaImpl extends ValidatorsImpl {
  /**
   * $(0.7.1 - 6.13)
   */
  toPosterior(
    curState: JamStateImpl,
    deps: { p_tau: Posterior<Tau> },
  ): Posterior<JamStateImpl["kappa"]> {
    if (isNewEra(deps.p_tau, curState.tau)) {
      return toPosterior(<any>structuredClone(curState.safroleState.gamma_p));
    }
    return toPosterior(<any>this);
  }
}
