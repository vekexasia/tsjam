import { cloneCodecable, JamCodecable } from "@tsjam/codec";
import { Posterior, Validated } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { JamStateImpl } from "./JamStateImpl";
import { TauImpl } from "./SlotImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";

@JamCodecable()
export class LambdaImpl extends ValidatorsImpl {
  /**
   * $(0.7.1 - 6.13)
   */
  toPosterior(
    curState: JamStateImpl,
    deps: { p_tau: Validated<Posterior<TauImpl>> },
  ): Posterior<JamStateImpl["lambda"]> {
    if (deps.p_tau.isNewerEra(curState.slot)) {
      return toPosterior(
        toTagged(
          new LambdaImpl({
            elements: toTagged(curState.kappa.elements.slice()),
          }),
        ),
      );
    }
    return toPosterior(toTagged(cloneCodecable(this)));
  }
}
