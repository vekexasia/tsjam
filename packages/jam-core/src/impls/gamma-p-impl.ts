import { PHI_FN } from "@/utils";
import { JamCodecable } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  BLSKey,
  ByteArrayOfLength,
  Posterior,
  Tagged,
  Validated,
} from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import type { DisputesStateImpl } from "./disputes-state-impl";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";
import { ValidatorsImpl } from "./validators-impl";
import { HeaderEpochMarkerImpl } from "./header-epoch-marker-impl";
import { ValidatorDataImpl } from "./validator-data-impl";

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

  /**
   * Useful to generate Genesis state
   * $(0.7.1 - 6.27)
   */
  static fromEpochMarker(epochMarker: HeaderEpochMarkerImpl) {
    const toRet = new GammaPImpl();
    toRet.elements = toTagged(
      epochMarker.validators.map((v) => {
        const validator = new ValidatorDataImpl({
          ed25519: v.ed25519,
          banderSnatch: v.bandersnatch,
          blsKey: <BLSKey>new Uint8Array(144).fill(0),
          metadata: <ByteArrayOfLength<128>>new Uint8Array(128).fill(0),
        });
        return validator;
      }),
    );
    return toRet;
  }

  static newEmpty(): GammaPImpl {
    return new GammaPImpl({
      elements: <GammaPImpl["elements"]>(
        Array.from({ length: NUMBER_OF_VALIDATORS }, () =>
          ValidatorDataImpl.newEmpty(),
        )
      ),
    });
  }
}
