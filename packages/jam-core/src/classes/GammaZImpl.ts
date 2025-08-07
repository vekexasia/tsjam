import {
  BandersnatchRingRootCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  JamCodecable,
  jsonCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { Bandersnatch } from "@tsjam/crypto";
import {
  BandersnatchRingRoot,
  GammaZ,
  Posterior,
  Validated,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { GammaPImpl } from "./GammaPImpl";
import { JamStateImpl } from "./JamStateImpl";
import { TauImpl } from "./SlotImpl";

@JamCodecable()
export class GammaZImpl extends BaseJamCodecable implements GammaZ {
  @jsonCodec(BufferJSONCodec(), SINGLE_ELEMENT_CLASS)
  @binaryCodec(BandersnatchRingRootCodec)
  root!: BandersnatchRingRoot;

  constructor(config: ConditionalExcept<GammaZImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  /**
   * $(0.7.1 - 6.13)
   */
  toPosterior(
    curState: JamStateImpl,
    deps: {
      p_tau: Validated<Posterior<TauImpl>>;
      p_gamma_p: Posterior<GammaPImpl>;
    },
  ): Posterior<GammaZImpl> {
    if (deps.p_tau.isNewerEra(curState.slot)) {
      return toPosterior(
        new GammaZImpl({
          root: Bandersnatch.ringRoot(
            deps.p_gamma_p.elements.map((v) => v.banderSnatch),
          ),
        }),
      );
    }
    return toPosterior(this);
  }
}
