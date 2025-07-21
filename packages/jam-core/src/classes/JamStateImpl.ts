import { BaseJamCodecable } from "@tsjam/codec";
import {
  AccumulationHistory,
  AccumulationQueue,
  AuthorizerQueue,
  Delta,
  Hash,
  HeaderLookupHistory,
  IDisputesState,
  JamEntropy,
  JamState,
  JamStatistics,
  PrivilegedServices,
  RHO,
  SafroleState,
  ServiceIndex,
  Tagged,
  Tau,
  Validators,
} from "@tsjam/types";
import { AuthorizerPoolImpl } from "./AuthorizerPoolImpl";
import { BetaImpl } from "./BetaImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";
import { AuthorizerQueueImpl } from "./AuthorizerQueueImpl";
import { PrivilegedServicesImpl } from "./PrivilegedServicesImpl";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { RHOImpl } from "./RHOImpl";
import { JamStatisticsImpl } from "./JamStatisticsImpl";
import { AccumulationHistoryImpl } from "./AccumulationHistoryImpl";
import { AccumulationQueueImpl } from "./AccumulationQueueImpl";
import { LastAccOutsImpl } from "./LastAccOutsImpl";
import { JamEntropyImpl } from "./JamEntropyImpl";

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
  safroleState: SafroleState;
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
  tau: Tau;
  /**
   * `θ` - `\lastaccout`
   * $(0.7.0 - 7.4)
   */
  mostRecentAccumulationOutputs!: LastAccOutsImpl;
  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory: HeaderLookupHistory;
}
