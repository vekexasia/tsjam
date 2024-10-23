import { Tau } from "./Tau";
import { OpaqueHash } from "./genericTypes";
import { PrivilegedServices } from "./pvm/PrivilegedServices";
import { AccumulationHistory } from "./states/AccumulationHistory";
import { AccumulationQueue } from "./states/AccumulationQueue";
import { AuthorizerPool } from "./states/AuthorizerPool";
import { AuthorizerQueue } from "./states/AuthorizerQueue";
import { Delta } from "./states/Delta";
import { IDisputesState } from "./states/DisputesState";
import { RecentHistory } from "./states/RecentHistory";
import { SafroleState } from "./states/SafroleState";
import { ValidatorStatistics } from "./states/ValidatorStatistics";
import { RHO } from "./states/rho";

/**
 * `σ`
 * Defines the state of JAM by combining all substate components
 * (15)
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
   * `δ`
   */
  serviceAccounts: Delta;

  /**
   * `η`
   */
  entropy: OpaqueHash;

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
  validatorStatistics: ValidatorStatistics;

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
};
