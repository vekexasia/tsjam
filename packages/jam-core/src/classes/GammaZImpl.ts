import {
  BandersnatchRingRootCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  JamCodecable,
  jsonCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { BandersnatchRingRoot, GammaZ, Posterior, Tau } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { JamStateImpl } from "./JamStateImpl";
import { GammaPImpl } from "./GammaPImpl";
import { Bandersnatch } from "@tsjam/crypto";
import { isNewEra, toPosterior } from "@tsjam/utils";

@JamCodecable()
export class GammaZImpl extends BaseJamCodecable implements GammaZ {
  @jsonCodec(BufferJSONCodec(), SINGLE_ELEMENT_CLASS)
  @binaryCodec(BandersnatchRingRootCodec)
  root!: BandersnatchRingRoot;

  constructor(config: ConditionalExcept<GammaZImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  toPosterior(
    curState: JamStateImpl,
    deps: { p_tau: Posterior<Tau>; p_gamma_p: Posterior<GammaPImpl> },
  ): Posterior<GammaZImpl> {
    if (isNewEra(deps.p_tau, curState.tau)) {
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
