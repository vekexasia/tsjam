import { PHI_FN } from "@/utils";
import { JamCodecable } from "@tsjam/codec";
import { Posterior, Tagged, Validated } from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import type { DisputesStateImpl } from "./disputes-state-impl";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { ValidatorsImpl } from "./validators-impl";

@JamCodecable()
export class GammaPImpl extends ValidatorsImpl {
  // $(0.7.1 - 6.13)
  toPosterior(deps: {
    iota: JamStateImpl["iota"];
    slot: JamStateImpl["slot"];
    p_tau: Validated<Posterior<TauImpl>>;
    p_offenders: Posterior<DisputesStateImpl["offenders"]>;
  }): Posterior<Tagged<GammaPImpl, "gamma_p">> {
    if (deps.p_tau.isNewerEra(deps.slot)) {
      return toPosterior(
        toTagged(
          new GammaPImpl({
            elements: PHI_FN(deps.iota.elements, deps.p_offenders),
          }),
        ),
      );
    }
    return toPosterior(toTagged(<GammaPImpl>this));
  }
}
