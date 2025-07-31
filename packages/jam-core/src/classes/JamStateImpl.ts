import { accumulateReports } from "@/accumulate";
import { Bandersnatch } from "@tsjam/crypto";
import { JamState, Posterior, StateRootHash, Tagged, Tau } from "@tsjam/types";
import {
  isNewEra,
  Timekeeping,
  toDagger,
  toPosterior,
  toTagged,
} from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { AccumulationHistoryImpl } from "./AccumulationHistoryImpl";
import { AccumulationQueueImpl } from "./AccumulationQueueImpl";
import { AuthorizerPoolImpl } from "./AuthorizerPoolImpl";
import { AuthorizerQueueImpl } from "./AuthorizerQueueImpl";
import { BetaImpl } from "./BetaImpl";
import { DeltaImpl } from "./DeltaImpl";
import {
  DisputesStateImpl,
  DisputesToPosteriorError,
} from "./DisputesStateImpl";
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
import { BLOCK_TIME } from "@tsjam/constants";
import { merkleStateMap, M_fn, bits } from "@/merklization";
import { GammaAError } from "./GammaAImpl";
import { DisputesExtrinsicValidationError } from "./extrinsics/disputes";
import { EGError } from "./extrinsics/guarantees";
import { ETError } from "./extrinsics/tickets";
import { EPError } from "./extrinsics/preimages";
import assert from "assert";

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
    | ImportBlockError
    | DisputesToPosteriorError
    | GammaAError
    | DisputesExtrinsicValidationError
    | ETError
    | EPError
    | EGError
  > {
    assert(this.block, "Cannot apply block to a state without a block");
    if (!this.block.isParentOf(newBlock)) {
      return err(ImportBlockError.InvalidParentHeader);
    }

    // $(0.7.1 - 6.1)
    const p_tau = toPosterior(newBlock.header.slot);

    // $(0.7.1 - 5.7)
    if (this.tau >= p_tau || p_tau * BLOCK_TIME > Timekeeping.bigT()) {
      return err(ImportBlockError.InvalidSlot);
    }

    // $(0.7.1 - 5.8)
    if (this.merkleRoot() !== newBlock.header.parentStateRoot) {
      return err(ImportBlockError.InvalidParentStateRoot);
    }

    // $(0.7.1 - 6.13)
    let p_kappa = toPosterior(this.kappa);
    let p_lambda = toPosterior(this.lambda);
    if (isNewEra(p_tau, this.tau)) {
      p_kappa = <any>structuredClone(this.safroleState.gamma_p);
      p_lambda = <any>structuredClone(this.kappa);
    }

    const p_entropy = this.entropy.toPosterior(this, {
      p_tau,
      vrfOutputHash: Bandersnatch.vrfOutputSignature(
        newBlock.header.entropySource,
      ),
    });
    const [dispExErr, disputesExtrinsic] = newBlock.extrinsics.disputes
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
      !newBlock.extrinsics.assurances.isValid({
        header: newBlock.header,
        kappa: this.kappa,
        d_rho,
      })
    ) {
      return err(ImportBlockError.InvalidEA);
    }

    const bold_R = AssurancesExtrinsicImpl.newlyAvailableReports(
      newBlock.extrinsics.assurances,
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

    const d_beta = this.beta.toDagger(newBlock.header);

    const dd_delta = DeltaImpl.toDoubleDagger(d_delta, {
      p_tau,
      bold_x: invokedTransfers,
      accumulationStatistics,
    });

    const [epError, validatedEP] = newBlock.extrinsics.preimages
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

    const [egError, validatedEG] = newBlock.extrinsics.reportGuarantees
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
    });

    const headerHash = newBlock.header.signedHash();

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
      authorIndex: newBlock.header.authorIndex,
      tau: this.tau,
      ea: newBlock.extrinsics.assurances,
      ep: validatedEP,
      extrinsics: newBlock.extrinsics,
      d_rho,
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
        tau: newBlock.header.slot,
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

    if (false === newBlock.header.verifySeal(p_state)) {
      return err(ImportBlockError.InvalidSeal);
    }
    if (false === newBlock.header.verifyEntropy(p_state)) {
      return err(ImportBlockError.InvalidEntropySignature);
    }

    if (false === newBlock.header.verifyEpochMarker(this, p_gamma_p)) {
      return err(ImportBlockError.InvalidEpochMarker);
    }

    if (false === newBlock.header.verifyTicketsMark(this)) {
      return err(ImportBlockError.InvalidTicketsMark);
    }

    if (false === newBlock.header.verifyExtrinsicHash(newBlock.extrinsics)) {
      return err(ImportBlockError.InvalidHx);
    }

    if (
      false === newBlock.header.verifyOffenders(newBlock.extrinsics.disputes)
    ) {
      return err(ImportBlockError.InvalidOffenders);
    }
    return ok(p_state);
  }

  static createNewBlock() {}
}

export enum ImportBlockError {
  InvalidParent = "Invalid parent",
  InvalidEA = "Invalid extrinsic assurances",

  InvalidHx = "Invalid extrinsic hash",
  InvalidSlot = "Invalid slot",
  InvalidSeal = "Invalid seal",
  InvalidEntropySignature = "Invalid entropy signature",
  InvalidEntropy = "Invalid entropy",
  InvalidEpochMarker = "Epoch marker set but not in new epoch",
  InvalidEpochMarkerValidator = "Epoch marker validator key mismatch",
  InvalidOffenders = "Invalid offenders",
  InvalidParentStateRoot = "Invalid parent state root",
  WinningTicketsNotEnoughLong = "Winning tickets not EPOCH long",
  WinningTicketsNotExpected = "Winning tickets set but not expected",
  WinningTicketMismatch = "WInning ticket mismatch",
  InvalidTicketsMark = "InvalidTicketsMark",
  InvalidParentHeader = "InvalidParentHeader",
}
