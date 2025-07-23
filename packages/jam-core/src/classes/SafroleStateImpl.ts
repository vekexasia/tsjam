import { PHI_FN } from "@/utils";
import {
  BandersnatchRingRootCodec,
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  codec,
  JamCodecable,
  jsonCodec,
} from "@tsjam/codec";
import { Bandersnatch } from "@tsjam/crypto";
import {
  BandersnatchRingRoot,
  Posterior,
  SafroleState,
  Tagged,
  Tau,
} from "@tsjam/types";
import { isNewEra, toPosterior, toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { GammaAError, GammaAImpl } from "./GammaAImpl";
import { GammaSImpl } from "./GammaSImpl";
import { JamEntropyImpl } from "./JamEntropyImpl";
import { JamStateImpl } from "./JamStateImpl";
import { TicketImpl } from "./TicketImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";

/**
 * Denoted with gamma (y) in the Greek alphabet.
 * This is the basic state of the Safrole state machine.
 * @see $(0.7.0 - 6.3)
 */
@JamCodecable()
export class SafroleStateImpl extends BaseJamCodecable implements SafroleState {
  /**
   * `YP`
   * pending set of validator that will be active in the next epoch and that determines
   * the next gamma_z
   * @see $(0.7.0 - 6.7)
   */
  @codec(ValidatorsImpl)
  gamma_p!: Tagged<ValidatorsImpl, "gamma_k">;
  /**
   * `YZ`
   * a Bandersnatch ring root composed with the one Bandersnatch key of each of the next
   * epoch’s validators, defined in gamma_k
   * @see $(0.7.0 - 6.4)
   */
  @jsonCodec(BufferJSONCodec())
  @binaryCodec(BandersnatchRingRootCodec)
  gamma_z!: Tagged<BandersnatchRingRoot, "gamma_z">;

  /**
   * `γs`
   * is the current epoch’s slot-sealer series, which is either a
   * full complement of EPOCH_LENGTH tickets or, in the case of a fallback
   * mode, a series of EPOCH_LENGTH Bandersnatch keys
   * @see $(0.7.0 - 6.5)
   */
  @codec(GammaSImpl)
  gamma_s!: GammaSImpl;

  /**
   * `γa` is the ticket accumulator, a series of highest scoring ticket identifiers to be used for the next epoch
   * @see $(0.7.0 - 6.5)
   */
  @codec(GammaAImpl)
  gamma_a!: GammaAImpl;

  constructor(config: ConditionalExcept<SafroleStateImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  toPosterior(
    curState: JamStateImpl,
    deps: {
      p_offenders: Posterior<DisputesStateImpl["offenders"]>;
      p_tau: Posterior<Tau>;
      p_entropy: Posterior<JamEntropyImpl>;
      p_kappa: Posterior<JamStateImpl["kappa"]>;
      // n in the paper
      newTickets: TicketImpl[];
    },
  ): Result<Posterior<SafroleStateImpl>, GammaAError> {
    let p_gamma_p = this.gamma_p;
    let p_gamma_z = this.gamma_z;
    // $(0.7.0 - 6.13)
    if (isNewEra(deps.p_tau, curState.tau)) {
      p_gamma_p = toTagged(
        new ValidatorsImpl({
          elements: PHI_FN(curState.iota.elements, deps.p_offenders),
        }),
      );
      p_gamma_z = Bandersnatch.ringRoot(
        p_gamma_p.elements.map((v) => v.banderSnatch),
      );
    }

    const [p_gamma_err, p_gamma_a] = this.gamma_a
      .toPosterior(curState, {
        p_tau: deps.p_tau,
        newTickets: deps.newTickets,
      })
      .safeRet();
    if (typeof p_gamma_err !== "undefined") {
      return err(p_gamma_err);
    }

    const toRet = new SafroleStateImpl({
      gamma_p: p_gamma_p,
      gamma_z: p_gamma_z,
      gamma_a: p_gamma_a,
      gamma_s: this.gamma_s.toPosterior(curState, {
        p_tau: deps.p_tau,
        p_eta2: toPosterior(deps.p_entropy._2),
        p_kappa: deps.p_kappa,
      }),
    });
    return ok(toPosterior(toRet));
  }
}
