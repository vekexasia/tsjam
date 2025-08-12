import { cloneCodecable, JamCodecable } from "@tsjam/codec";
import { Posterior, Validated } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { JamStateImpl } from "./jam-state-impl";
import { TauImpl } from "./slot-impl";
import { ValidatorsImpl } from "./validators-impl";

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
      const cloned = cloneCodecable(curState.safroleState.gamma_p);
      const newK = new KappaImpl({ elements: cloned.elements });
      return toPosterior(toTagged(newK));
    }
    return toPosterior(toTagged(cloneCodecable(this)));
  }
}
