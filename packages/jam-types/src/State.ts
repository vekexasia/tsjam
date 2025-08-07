import { JamEntropy } from "./Entropy";
import { Slot } from "./Slot";
import { Validators } from "./Validators";
import { Tagged } from "./genericTypes";
import { PrivilegedServices } from "./pvm/PrivilegedServices";
import { AccumulationHistory } from "./states/AccumulationHistory";
import { AccumulationQueue } from "./states/AccumulationQueue";
import { AuthorizerPool } from "./states/AuthorizerPool";
import { AuthorizerQueue } from "./states/AuthorizerQueue";
import { Delta } from "./states/Delta";
import { IDisputesState } from "./states/DisputesState";
import { HeaderLookupHistory } from "./states/HeaderLookupHistory";
import { LastAccOuts } from "./states/LastAccOuts";
import { Beta } from "./states/RecentHistory";
import { SafroleState } from "./states/SafroleState";
import { JamStatistics } from "./states/Statistics";
import { RHO } from "./states/rho";

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
  beta: Beta;
  /**
   * `γ`
   */
  safroleState: SafroleState;

  /**
   * `λ` Validator keys and metadata which were active in the prior epoch.
   */
  lambda: Tagged<Validators, "lambda">;

  /**
   * `κ` Validator keys and metadata which are active in the current epoch.
   */
  kappa: Tagged<Validators, "kappa">;

  /**
   * `ι` Validator keys and metadata which will be active in the next epoch.
   */
  iota: Tagged<Validators, "iota">;

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
  slot: Slot;

  /**
   * `θ` - `\lastaccout`
   */
  mostRecentAccumulationOutputs: LastAccOuts;

  /**
   * NOTE: this is not included in gp but used as per type doc
   */
  headerLookupHistory: HeaderLookupHistory;
};
