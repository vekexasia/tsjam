import { JamEntropy } from "./entropy";
import { Slot } from "./slot";
import { Validators } from "./validators";
import { Tagged } from "./generic-types";
import { PrivilegedServices } from "./pvm/privileged-services";
import { AccumulationHistory } from "./states/accumulation-history";
import { AccumulationQueue } from "./states/accumulation-queue";
import { AuthorizerPool } from "./states/authorizer-pool";
import { AuthorizerQueue } from "./states/authorizer-queue";
import { Delta } from "./states/delta";
import { IDisputesState } from "./states/disputes-state";
import { HeaderLookupHistory } from "./states/header-lookup-history";
import { LastAccOuts } from "./states/last-acc-outs";
import { Beta } from "./states/recent-history";
import { SafroleState } from "./states/safrole-state";
import { JamStatistics } from "./states/statistics";
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
