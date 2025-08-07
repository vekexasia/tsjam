import { Posterior, Tagged, Tau } from "@tsjam/types";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { JamStateImpl } from "./JamStateImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";
import { isNewEra, toPosterior, toTagged } from "@tsjam/utils";
import { PHI_FN } from "@/utils";
import { JamCodecable } from "@tsjam/codec";

@JamCodecable()
export class GammaPImpl extends ValidatorsImpl {
  // $(0.7.1 - 6.13)
  toPosterior(
    curState: JamStateImpl,
    deps: {
      p_tau: Posterior<Tau>;
      p_offenders: Posterior<DisputesStateImpl["offenders"]>;
    },
  ): Posterior<Tagged<GammaPImpl, "gamma_p">> {
    if (isNewEra(deps.p_tau, curState.tau)) {
      return toPosterior(
        toTagged(
          new GammaPImpl({
            elements: PHI_FN(curState.iota.elements, deps.p_offenders),
          }),
        ),
      );
    }
    return toPosterior(toTagged(this));
  }
}
