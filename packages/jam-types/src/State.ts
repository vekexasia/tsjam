import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { ValidatorData } from "./ValidatorData";
import { JamEntropy } from "./Entropy";
import { Tau } from "./Tau";
import { PrivilegedServices } from "./pvm/PrivilegedServices";
import { AccumulationHistory } from "./states/AccumulationHistory";
import { AccumulationQueue } from "./states/AccumulationQueue";
import { AuthorizerPool } from "./states/AuthorizerPool";
import { AuthorizerQueue } from "./states/AuthorizerQueue";
import { Delta } from "./states/Delta";
import { IDisputesState } from "./states/DisputesState";
import { RecentHistory } from "./states/RecentHistory";
import { SafroleState } from "./states/SafroleState";
import { RHO } from "./states/rho";
import { Hash, SeqOfLength, ServiceIndex } from "./genericTypes";
import { HeaderLookupHistory } from "./states/HeaderLookupHistory";
import { JamStatistics } from "./states/Statistics";
import { ServiceOuts } from "./states/ServiceOuts";

/**
 * `σ`
 * Defines the state of JAM by combining all substate components
 * $(0.6.4 - 4.4)
 */
export type JamState = {
  /**
   * `α`
   */
  authPool: AuthorizerPool;
  /**
   * `β`
   */
  recentHistory: RecentHistory;
  /**
   * `γ`
   */
  safroleState: SafroleState;

  /**
   * `λ` Validator keys and metadata which were active in the prior epoch.
   */
  lambda: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "lambda">;

  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "kappa">;

  /**
   * `ι` Validator keys and metadata which will be active in the next epoch.
   */
  iota: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS, "iota">;

  /**
   * `δ`
   */
  serviceAccounts: Delta;

  /**
   * `η`
   */
  entropy: JamEntropy;

  /**
   * `φ`
   */
  authQueue: AuthorizerQueue;

  /**
   * `χ`
   */
  privServices: PrivilegedServices;

  /**
   * `ψ`
   */
  disputes: IDisputesState;

  /**
   * `π`
   */
  statistics: JamStatistics;

  /**
   * `θ`
   */
  accumulationQueue: AccumulationQueue;

  /**
   * `ξ`
   */
  accumulationHistory: AccumulationHistory;

  /**
   * `ρ`
   */
  rho: RHO;

  /**
   * `τ` - the most recent block timeslot
   */
  tau: Tau;

  /**
   * `θ` - `\lastaccout`
   */
  mostRecentAccumulationOutputs: Array<{
    serviceIndex: ServiceIndex;
    accumulationResult: Hash;
  }>;

  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory: HeaderLookupHistory;
};
