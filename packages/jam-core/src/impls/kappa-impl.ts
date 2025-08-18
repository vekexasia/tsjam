import { cloneCodecable, JamCodecable } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { Posterior, Validated } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { ValidatorDataImpl } from "./validator-data-impl";
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

  static create(): KappaImpl {
    return new KappaImpl({
      elements: <KappaImpl["elements"]>(
        Array.from({ length: NUMBER_OF_VALIDATORS }, () =>
          ValidatorDataImpl.create(),
        )
      ),
    });
  }
}
