import { accumulateReports } from "@/accumulate";
import { Bandersnatch } from "@tsjam/crypto";
import { JamState, Posterior, StateRootHash, Tagged } from "@tsjam/types";
import { toDagger, toPosterior, toTagged } from "@tsjam/utils";
import assert from "assert";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import type { AccumulationHistoryImpl } from "./accumulation-history-impl";
import type { AccumulationQueueImpl } from "./accumulation-queue-impl";
import type { AuthorizerPoolImpl } from "./authorizer-pool-impl";
import type { AuthorizerQueueImpl } from "./authorizer-queue-impl";
import type { BetaImpl } from "./beta-impl";
import type { DeltaImpl } from "./delta-impl";
import {
  DisputesStateImpl,
  DisputesToPosteriorError,
} from "./disputes-state-impl";
import {
  AssurancesExtrinsicImpl,
  EAValidationError,
} from "./extrinsics/assurances";
import type { EGError } from "./extrinsics/guarantees";
import type { EPError } from "./extrinsics/preimages";
import type { ETError } from "./extrinsics/tickets";
import type { GammaAError } from "./gamma-a-impl";
import type { HeaderLookupHistoryImpl } from "./header-lookup-history-impl";
import type { JamBlockImpl } from "./jam-block-impl";
import type { JamEntropyImpl } from "./jam-entropy-impl";
import type { JamStatisticsImpl } from "./jam-statistics-impl";
import type { KappaImpl } from "./kappa-impl";
import type { LambdaImpl } from "./lambda-impl";
import type { LastAccOutsImpl } from "./last-acc-outs-impl";
import type { PrivilegedServicesImpl } from "./privileged-services-impl";
import type { RHOImpl } from "./rho-impl";
import type { SafroleStateImpl } from "./safrole-state-impl";
import type { TauError, TauImpl } from "./slot-impl";
import type { ValidatorsImpl } from "./validators-impl";
import type { DisputesVerdictError } from "./extrinsics/disputes/verdicts";
import type { DisputesCulpritError } from "./extrinsics/disputes/culprits";
import type { DisputesFaultError } from "./extrinsics/disputes/faults";
import { merkleStateMap, M_fn, bits } from "@/merklization/state";
import { HeaderValidationError } from "./jam-signed-header-impl";

export class JamStateImpl implements JamState {
  /**
   * The block which produced this state
   * or undefined if state was reconstructed without block
   */
  block?: JamBlockImpl;
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
  lambda!: Tagged<LambdaImpl, "lambda">;

  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa!: Tagged<KappaImpl, "kappa">;

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
  slot!: TauImpl;

  /**
   * `θ` - `\lastaccout`
   */
  mostRecentAccumulationOutputs!: LastAccOutsImpl;

  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory!: HeaderLookupHistoryImpl;

  constructor(config: ConditionalExcept<JamStateImpl, Function>) {
    Object.assign(this, config);
  }

  merkleRoot(): StateRootHash {
    const stateMap = merkleStateMap(this);
    return M_fn(
      new Map(
        [...stateMap.entries()].map(([k, v]) => {
          return [bits(k), [k, v]];
        }),
      ),
    ) as StateRootHash;
  }

  applyBlock(
    newBlock: JamBlockImpl,
  ): Result<
    Posterior<JamStateImpl>,
    | DisputesToPosteriorError
    | DisputesVerdictError
    | DisputesCulpritError
    | DisputesFaultError
    | GammaAError
    | EAValidationError
    | ETError
    | EPError
    | EGError
    | TauError
    | HeaderValidationError
  > {
    assert(this.block, "Cannot apply block to a state without a block");

    // $(0.7.1 - 6.1)
    const proposed_p_tau = toPosterior(newBlock.header.slot);

    const [tauErr, p_tau] = proposed_p_tau.checkPTauValid(this.slot).safeRet();
    if (typeof tauErr !== "undefined") {
      return err(tauErr);
    }

    // $(0.7.1 - 6.13)
    const p_kappa = this.kappa.toPosterior(this, { p_tau });
    const p_lambda = this.lambda.toPosterior(this, { p_tau });

    const p_entropy = this.entropy
      .rotate1_3({
        slot: this.slot,
        p_tau,
      })
      .toPosterior({
        vrfOutputHash: Bandersnatch.vrfOutputSignature(
          newBlock.header.entropySource,
        ),
      });
    const [dispExErr, disputesExtrinsic] = newBlock.extrinsics.disputes
      .checkValidity({
        disputesState: this.disputes,
        tau: this.slot,
        kappa: this.kappa,
        lambda: this.lambda,
      })
      .safeRet();

    if (typeof dispExErr !== "undefined") {
      return err(dispExErr);
    }

    const [p_disputesError, p_disputes] = this.disputes
      .toPosterior({
        kappa: this.kappa,
        lambda: this.lambda,
        extrinsic: disputesExtrinsic,
      })
      .safeRet();
    if (typeof p_disputesError !== "undefined") {
      return err(p_disputesError);
    }

    const p_gamma_p = this.safroleState.gamma_p.toPosterior({
      slot: this.slot,
      iota: this.iota,
      p_tau,
      p_offenders: toPosterior(p_disputes.offenders),
    });
    const p_gamma_z = this.safroleState.gamma_z.toPosterior({
      slot: this.slot,
      p_tau,
      p_gamma_p,
    });

    const [newTicketsErr, newTickets] = newBlock.extrinsics.tickets
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

    const p_gamma_s = this.safroleState.gamma_s.toPosterior({
      slot: this.slot,
      safroleState: this.safroleState,
      p_tau,
      p_kappa,
      p_eta2: toPosterior(p_entropy._2),
    });

    const [p_gamma_aErr, p_gamma_a] = this.safroleState.gamma_a
      .toPosterior({
        slot: this.slot,
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

    //now we can check the header
    const [headerErr] = newBlock.header
      .checkValidity({
        disputesExtrinsic,
        p_kappa,
        extrinsicHash: newBlock.extrinsics.extrinsicHash(),
        curState: this,
        prevHeader: this.block.header,
        p_entropy_3: toPosterior(p_entropy._3),
        p_gamma_s,
        p_gamma_p,
      })
      .safeRet();

    if (typeof headerErr !== "undefined") {
      return err(headerErr);
    }

    const d_rho = this.rho.toDagger({ p_disputes });
    const [eaError, validatedEA] = newBlock.extrinsics.assurances
      .checkValidity({
        headerParent: this.block.header.signedHash(),
        kappa: this.kappa,
        d_rho,
      })
      .safeRet();
    if (typeof eaError !== "undefined") {
      return err(eaError);
    }

    const bold_R = AssurancesExtrinsicImpl.newlyAvailableReports(
      validatedEA,
      d_rho,
    );

    const {
      p_accumulationHistory,
      p_accumulationQueue,
      p_mostRecentAccumulationOutputs,
      deferredTransfers,
      p_privServices,
      d_delta,
      p_iota,
      p_authQueue,
      accumulationStatistics,
    } = accumulateReports(bold_R, {
      tau: this.slot,
      p_tau,
      accumulationHistory: this.accumulationHistory,
      accumulationQueue: this.accumulationQueue,
      authQueue: this.authQueue,
      serviceAccounts: this.serviceAccounts,
      privServices: this.privServices,
      iota: this.iota,
      p_eta_0: toPosterior(p_entropy._0),
    });
    const d_beta = this.beta.toDagger(newBlock.header.parentStateRoot);
    const invokedTransfers = deferredTransfers.invokedTransfers({
      d_delta,
      p_tau,
      p_eta_0: p_entropy._0,
    });

    const dd_delta = d_delta.toDoubleDagger({
      p_tau,
      invokedTransfers,
      accumulationStatistics,
    });

    const [epError, validatedEP] = newBlock.extrinsics.preimages
      .checkValidity({ serviceAccounts: this.serviceAccounts })
      .safeRet();

    if (epError) {
      return err(epError);
    }

    const p_delta = dd_delta.toPosterior({
      p_tau,
      ep: validatedEP,
    });

    const dd_rho = d_rho.toDoubleDagger({
      p_tau,
      newReports: bold_R,
      rho: this.rho,
    });

    const [egError, validatedEG] = newBlock.extrinsics.reportGuarantees
      .checkValidity({
        beta: this.beta,
        rho: this.rho,
        accumulationHistory: this.accumulationHistory,
        accumulationQueue: this.accumulationQueue,
        authPool: this.authPool,
        headerLookupHistory: this.headerLookupHistory,
        serviceAccounts: this.serviceAccounts,

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

    const p_rho = dd_rho.toPosterior({
      p_tau,
      EG_Extrinsic: validatedEG,
    });

    const headerHash = newBlock.header.signedHash();

    const p_beta = d_beta.toPosterior({
      headerHash,
      eg: validatedEG,
      p_theta: p_mostRecentAccumulationOutputs,
    });

    const p_statistics = this.statistics.toPosterior({
      tau: this.slot,
      p_tau,
      extrinsics: newBlock.extrinsics,
      ea: validatedEA,
      ep: validatedEP,
      d_rho,
      p_disputes,
      authorIndex: newBlock.header.authorIndex,
      p_entropy,
      p_kappa,
      p_lambda,
      accumulationStatistics,
      transferStatistics: deferredTransfers.statistics(invokedTransfers),
    });

    const p_authPool = this.authPool.toPosterior({
      p_tau,
      eg: validatedEG,
      p_queue: p_authQueue,
    });

    const p_headerLookupHistory = this.headerLookupHistory.toPosterior({
      header: newBlock.header,
    });

    const p_state = toPosterior(
      new JamStateImpl({
        block: newBlock,
        entropy: p_entropy,
        slot: newBlock.header.slot,
        iota: toTagged(p_iota),
        authPool: p_authPool,
        authQueue: p_authQueue,
        safroleState: p_safroleState,
        statistics: p_statistics,
        rho: p_rho,
        serviceAccounts: p_delta,
        beta: p_beta,
        accumulationQueue: p_accumulationQueue,
        accumulationHistory: p_accumulationHistory,
        privServices: p_privServices,
        lambda: toTagged(p_lambda),
        kappa: toTagged(p_kappa),
        disputes: p_disputes,
        headerLookupHistory: p_headerLookupHistory,
        mostRecentAccumulationOutputs: p_mostRecentAccumulationOutputs,
      }),
    );

    return ok(p_state);
  }
}
