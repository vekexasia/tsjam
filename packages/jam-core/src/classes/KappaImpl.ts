import { JamCodecable } from "@tsjam/codec";
import { Posterior, Validated } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { JamStateImpl } from "./JamStateImpl";
import { TauImpl } from "./SlotImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";

@JamCodecable()
export class KappaImpl extends ValidatorsImpl {
  /**
   * $(0.7.1 - 6.13)
   */
  toPosterior(
    curState: JamStateImpl,
    deps: { p_tau: Validated<Posterior<TauImpl>> },
  ): Posterior<JamStateImpl["kappa"]> {
    if (deps.p_tau.isNewerEra(curState.slot)) {
      return toPosterior(<any>structuredClone(curState.safroleState.gamma_p));
    }
    return toPosterior(structuredClone(<any>this));
  }
}
