import { accumulateReports } from "@/accumulate";
import { Bandersnatch } from "@tsjam/crypto";
import { JamState, Tagged, Tau } from "@tsjam/types";
import { isNewEra, toDagger, toPosterior } from "@tsjam/utils";
import assert from "assert";
import { err } from "neverthrow";
import { AccumulationHistoryImpl } from "./AccumulationHistoryImpl";
import { AccumulationQueueImpl } from "./AccumulationQueueImpl";
import { AuthorizerPoolImpl } from "./AuthorizerPoolImpl";
import { AuthorizerQueueImpl } from "./AuthorizerQueueImpl";
import { BetaImpl } from "./BetaImpl";
import { DeltaImpl } from "./DeltaImpl";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { AssurancesExtrinsicImpl } from "./extrinsics/assurances";
import { HeaderLookupHistoryImpl } from "./HeaderLookupHistoryImpl";
import { JamBlockImpl } from "./JamBlockImpl";
import { JamEntropyImpl } from "./JamEntropyImpl";
import { JamStatisticsImpl } from "./JamStatisticsImpl";
import { LastAccOutsImpl } from "./LastAccOutsImpl";
import { PrivilegedServicesImpl } from "./PrivilegedServicesImpl";
import { RHOImpl } from "./RHOImpl";
import { SafroleStateImpl } from "./SafroleStateImpl";
import { ValidatorDataImpl } from "./ValidatorDataImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";

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
   * `ω`
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

  /**
   * `HA` in the graypaper
   * @param header - the header of the blockj
   * @param state - the state of the safrole state machine
   *
   * $(0.7.0 - 5.9)
   *
   */
  blockAuthor(): ValidatorDataImpl {
    const lookupResult = this.headerLookupHistory.get(this.tau)!;
    assert(lookupResult, "Header lookup history should have the current tau");
    return this.kappa.at(lookupResult.authorIndex);
  }

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
    const [dispExErr, disputesExtrinsic] = block.extrinsics.disputes
      .checkValidity({
        tau: this.tau,
        kappa: this.kappa,
        lambda: this.lambda,
      })
      .safeRet();

    if (typeof dispExErr !== "undefined") {
      return err(dispExErr);
    }

    const [p_disputesError, p_disputes] = this.disputes
      .toPosterior(this, {
        extrinsic: disputesExtrinsic,
      })
      .safeRet();
    if (typeof p_disputesError !== "undefined") {
      return err(p_disputesError);
    }

    const p_gamma_p = this.safroleState.gamma_p.toPosterior(this, {
      p_tau,
      p_offenders: toPosterior(p_disputes.offenders),
    });
    const p_gamma_z = this.safroleState.gamma_z.toPosterior(this, {
      p_tau,
      p_gamma_p,
    });

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

    const p_gamma_s = this.safroleState.gamma_s.toPosterior(this, {
      p_tau,
      p_kappa,
      p_eta2: toPosterior(p_entropy._2),
    });

    const [p_gamma_aErr, p_gamma_a] = this.safroleState.gamma_a
      .toPosterior(this, {
        p_tau,
        newTickets,
      })
      .safeRet();
    if (typeof p_gamma_aErr !== "undefined") {
      return err(p_gamma_aErr);
    }

    const p_safroleState = this.safroleState.toPosterior({
      p_gamma_p,
      p_gamma_z,
      p_gamma_a,
      p_gamma_s,
    });

    const d_rho = this.rho.toDagger({ p_disputes });

    if (
      !block.extrinsics.assurances.isValid({
        header: block.header,
        kappa: this.kappa,
        d_rho,
      })
    ) {
      throw new Error("TODO neverthrow");
    }

    const bold_R = AssurancesExtrinsicImpl.newlyAvailableReports(
      block.extrinsics.assurances,
      d_rho,
    );

    const [
      ,
      {
        p_accumulationQueue,
        p_accumulationHistory,
        d_delta,
        p_iota,
        p_authQueue,
        deferredTransfers,
        p_mostRecentAccumulationOutputs,
        p_privServices,
        accumulationStatistics,
      },
    ] = accumulateReports(bold_R, {
      tau: this.tau,
      p_tau,
      accumulationHistory: this.accumulationHistory,
      accumulationQueue: this.accumulationQueue,
      authQueue: this.authQueue,
      serviceAccounts: this.serviceAccounts,
      privServices: this.privServices,
      iota: this.iota,
      p_eta_0: toPosterior(p_entropy._0),
    }).safeRet();
    const { invokedTransfers, stats: transferStatistics } =
      deferredTransfers.invokeOnTransfer({
        d_delta,
        p_tau,
      });

    const d_beta = this.beta.toDagger(block.header);

    const dd_delta = DeltaImpl.toDoubleDagger(d_delta, {
      p_tau,
      bold_x: invokedTransfers,
      accumulationStatistics,
    });

    const [epError, validatedEP] = block.extrinsics.preimages
      .checkValidity({ serviceAccounts: this.serviceAccounts })
      .safeRet();

    if (epError) {
      return err(epError);
    }

    const p_delta = DeltaImpl.toPosterior(dd_delta, {
      p_tau,
      ep: validatedEP,
    });

    const dd_rho = RHOImpl.toDoubleDagger(d_rho, {
      p_tau,
      newReports: bold_R,
      rho: this.rho,
    });

    const [egError, validatedEG] = block.extrinsics.reportGuarantees
      .checkValidity(this, {
        dd_rho,
        d_recentHistory: toDagger(d_beta.recentHistory),
        p_entropy,
        p_kappa,
        p_lambda,
        p_disputes,
        p_tau,
      })
      .safeRet();
    if (typeof egError !== "undefined") {
      return err(egError);
    }

    const p_rho = RHOImpl.toPosterior(dd_rho, {
      p_tau,
      EG_Extrinsic: validatedEG,
      kappa: this.kappa,
    });

    const headerHash = block.header.signedHash();

    const p_beta = BetaImpl.toPosterior(d_beta, {
      headerHash,
      eg: validatedEG,
      p_theta: p_mostRecentAccumulationOutputs,
    });

    const p_statistics = this.statistics.toPosterior({
      transferStatistics,
      accumulationStatistics,
      p_kappa,
      p_entropy,
      p_disputes,
      p_tau,
      p_lambda,
      authorIndex: block.header.authorIndex,
      tau: this.tau,
      ea: block.extrinsics.assurances,
      ep: validatedEP,
      extrinsics: block.extrinsics,
      d_rho,
    });

    const p_authPool = this.authPool.toPosterior({
      p_tau,
      eg: validatedEG,
      p_queue: p_authQueue,
    });

    const p_headerLookupHistory = this.headerLookupHistory.toPosterior({
      header: block.header,
    });
  }

  static createNewBlock() {}
}
