import { cloneCodecable, JamCodecable } from "@tsjam/codec";
import { Posterior, Validated } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { ValidatorsImpl } from "./validators-impl";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { ValidatorDataImpl } from "./validator-data-impl";

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

  static newEmpty(): LambdaImpl {
    return new LambdaImpl({
      elements: <LambdaImpl["elements"]>(
        Array.from({ length: NUMBER_OF_VALIDATORS }, () =>
          ValidatorDataImpl.newEmpty(),
        )
      ),
    });
  }
}
