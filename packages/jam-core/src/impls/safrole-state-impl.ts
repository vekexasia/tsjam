import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import type { Posterior, SafroleState, Tagged } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import type { ConditionalExcept } from "type-fest";
import { GammaAImpl } from "./gamma-a-impl";
import { GammaPImpl } from "./gamma-p-impl";
import { GammaSImpl } from "./gamma-s-impl";
import { GammaZImpl } from "./gamma-z-impl";

/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 * @see $(0.7.1 - 6.3)
 */
@JamCodecable()
export class SafroleStateImpl extends BaseJamCodecable implements SafroleState {
  /**
   * `YP`
   * pending set of validator that will be active in the next epoch and that determines
   * the next gamma_z
   * @see $(0.7.1 - 6.7)
   */
  @codec(GammaPImpl)
  gamma_p!: Tagged<GammaPImpl, "gamma_p">;
  /**
   * `YZ`
   * a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   * @see $(0.7.1 - 6.4)
   */
  @codec(GammaZImpl)
  gamma_z!: GammaZImpl;

  /**
   * `γs`
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of EPOCH_LENGTH tickets or, in the case of a fallback
   * mode, a series of EPOCH_LENGTH Bandersnatch keys
   * @see $(0.7.1 - 6.5)
   */
  @codec(GammaSImpl)
  gamma_s!: GammaSImpl;

  /**
   * `γa` is the ticket accumulator, a series of highest scoring ticket identifiers to be used for the next epoch
   * @see $(0.7.1 - 6.5)
   */
  @codec(GammaAImpl)
  gamma_a!: GammaAImpl;

  constructor(config?: ConditionalExcept<SafroleStateImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  toPosterior(deps: {
    p_gamma_p: Posterior<Tagged<GammaPImpl, "gamma_p">>;
    p_gamma_z: Posterior<GammaZImpl>;
    p_gamma_a: Posterior<GammaAImpl>;
    p_gamma_s: Posterior<GammaSImpl>;
  }): Posterior<SafroleStateImpl> {
    const toRet = new SafroleStateImpl({
      gamma_p: deps.p_gamma_p,
      gamma_z: deps.p_gamma_z,
      gamma_a: deps.p_gamma_a,
      gamma_s: deps.p_gamma_s,
    });
    return toPosterior(toRet);
  }

  static newEmpty(): SafroleStateImpl {
    return new SafroleStateImpl({
      gamma_s: GammaSImpl.newEmpty(),
      gamma_a: GammaAImpl.newEmpty(),
      gamma_z: GammaZImpl.newEmpty(),
      gamma_p: <Tagged<GammaPImpl, "gamma_p">>GammaPImpl.newEmpty(),
    });
  }
}
