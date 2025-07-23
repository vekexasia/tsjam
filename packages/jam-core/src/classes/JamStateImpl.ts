import { JamState, Tagged, Tau } from "@tsjam/types";
import { AccumulationHistoryImpl } from "./AccumulationHistoryImpl";
import { AccumulationQueueImpl } from "./AccumulationQueueImpl";
import { AuthorizerPoolImpl } from "./AuthorizerPoolImpl";
import { AuthorizerQueueImpl } from "./AuthorizerQueueImpl";
import { BetaImpl } from "./BetaImpl";
import { DeltaImpl } from "./DeltaImpl";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { HeaderLookupHistoryImpl } from "./HeaderLookupHistoryImpl";
import { JamEntropyImpl } from "./JamEntropyImpl";
import { JamStatisticsImpl } from "./JamStatisticsImpl";
import { LastAccOutsImpl } from "./LastAccOutsImpl";
import { PrivilegedServicesImpl } from "./PrivilegedServicesImpl";
import { RHOImpl } from "./RHOImpl";
import { SafroleStateImpl } from "./SafroleStateImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";
import { JamBlockImpl } from "./JamBlockImpl";
import { isNewEra, toPosterior } from "@tsjam/utils";
import { Bandersnatch } from "@tsjam/crypto";
import { err } from "neverthrow";

export class JamStateImpl implements JamState {
  /**
   * `α`
   */
  authPool!: AuthorizerPoolImpl;
  /**
   * `β`
   */
  beta!: BetaImpl;
  /**
   * `γ`
   */
  safroleState!: SafroleStateImpl;
  /**
   * `λ` Validator keys and metadata which were active in the prior epoch.
   */
  lambda!: Tagged<ValidatorsImpl, "lambda">;
  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa!: Tagged<ValidatorsImpl, "kappa">;
  /**
   * `ι` Validator keys and metadata which will be active in the next epoch.
   */
  iota!: Tagged<ValidatorsImpl, "iota">;
  /**
   * `δ`
   */
  serviceAccounts!: DeltaImpl;
  /**
   * `η`
   */
  entropy!: JamEntropyImpl;
  /**
   * `φ`
   */
  authQueue!: AuthorizerQueueImpl;
  /**
   * `χ`
   */
  privServices!: PrivilegedServicesImpl;
  /**
   * `ψ`
   */
  disputes!: DisputesStateImpl;
  /**
   * `π`
   */
  statistics!: JamStatisticsImpl;
  /**
   * `θ`
   */
  accumulationQueue!: AccumulationQueueImpl;
  /**
   * `ξ`
   */
  accumulationHistory!: AccumulationHistoryImpl;
  /**
   * `ρ`
   */
  rho!: RHOImpl;
  /**
   * `τ` - the most recent block timeslot
   */
  tau!: Tau;
  /**
   * `θ` - `\lastaccout`
   * $(0.7.0 - 7.4)
   */
  mostRecentAccumulationOutputs!: LastAccOutsImpl;
  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory!: HeaderLookupHistoryImpl;

  applyBlock(block: JamBlockImpl) {
    const p_tau = toPosterior(block.header.slot);
    let p_kappa = toPosterior(this.kappa);
    let p_lambda = toPosterior(this.lambda);
    if (isNewEra(block.header.slot, this.tau)) {
      p_kappa = <any>structuredClone(this.safroleState.gamma_p);
      p_lambda = <any>structuredClone(this.kappa);
    }

    const p_entropy = this.entropy.toPosterior(this, {
      p_tau,
      vrfOutputHash: Bandersnatch.vrfOutputSignature(
        block.header.entropySource,
      ),
    });

    const [p_disputesError, p_disputes] = this.disputes
      .toPosterior(this, {
        extrinsic: block.extrinsics.disputes,
      })
      .safeRet();
    if (typeof p_disputesError !== "undefined") {
      return err(p_disputesError);
    }

    const [newTicketsErr, newTickets] = block.extrinsics.tickets
      .newTickets({
        p_tau,
        p_gamma_z,
        gamma_a: this.safroleState.gamma_a,
        p_entropy,
      })
      .safeRet();

    if (typeof newTicketsErr !== "undefined") {
      return err(newTicketsErr);
    }
    const [p_safroleState_err, p_safroleState] = this.safroleState.toPosterior(
      this,
      {
        p_kappa,
        p_tau,
        p_entropy,
        p_offenders: toPosterior(p_disputes.offenders),
        newTickets,
      },
    );
  }
}
