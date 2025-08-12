import { PHI_FN } from "@/utils";
import { JamCodecable } from "@tsjam/codec";
import { Posterior, Tagged, Validated } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { DisputesStateImpl } from "./disputes-state-impl";
import { JamStateImpl } from "./jam-state-impl";
import { TauImpl } from "./slot-impl";
import { ValidatorsImpl } from "./validators-impl";

@JamCodecable()
export class GammaPImpl extends ValidatorsImpl {
  // $(0.7.1 - 6.13)
  toPosterior(
    curState: JamStateImpl,
    deps: {
      p_tau: Validated<Posterior<TauImpl>>;
      p_offenders: Posterior<DisputesStateImpl["offenders"]>;
    },
  ): Posterior<Tagged<GammaPImpl, "gamma_p">> {
    if (deps.p_tau.isNewerEra(curState.slot)) {
      return toPosterior(
        toTagged(
          new GammaPImpl({
            elements: PHI_FN(curState.iota.elements, deps.p_offenders),
          }),
        ),
      );
    }
    return toPosterior(toTagged(<GammaPImpl>this));
  }
}
