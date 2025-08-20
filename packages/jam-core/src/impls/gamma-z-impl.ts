import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { Bandersnatch } from "@tsjam/crypto";
import type {
  BandersnatchRingRoot,
  GammaZ,
  Posterior,
  Validated,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import type { ConditionalExcept } from "type-fest";
import type { GammaPImpl } from "./gamma-p-impl";
import type { JamStateImpl } from "./jam-state-impl";
import type { TauImpl } from "./slot-impl";

@JamCodecable()
export class GammaZImpl extends BaseJamCodecable implements GammaZ {
  @codec(xBytesCodec(144), SINGLE_ELEMENT_CLASS)
  root!: BandersnatchRingRoot;

  constructor(config: ConditionalExcept<GammaZImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  /**
   * $(0.7.1 - 6.13)
   */
  toPosterior(deps: {
    slot: JamStateImpl["slot"];
    p_tau: Validated<Posterior<TauImpl>>;
    p_gamma_p: Posterior<GammaPImpl>;
  }): Posterior<GammaZImpl> {
    if (deps.p_tau.isNewerEra(deps.slot)) {
      return toPosterior(
        new GammaZImpl({
          root: Bandersnatch.ringRoot(
            deps.p_gamma_p.elements.map((v) => v.banderSnatch),
          ),
        }),
      );
    }
    return toPosterior(<GammaZImpl>this);
  }

  static newEmpty(): GammaZImpl {
    return new GammaZImpl({
      root: <BandersnatchRingRoot>new Uint8Array(144).fill(0),
    });
  }
}
