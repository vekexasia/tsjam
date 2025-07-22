import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Gas,
  PVMAccumulationState,
  SeqOfLength,
  ServiceIndex,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { AuthorizerQueueImpl } from "./AuthorizerQueueImpl";
import { DeltaImpl } from "./DeltaImpl";
import { ValidatorDataImpl } from "./ValidatorDataImpl";
import { ValidatorsImpl } from "./ValidatorsImpl";

/**
 * `S` in the graypaper
 * $(0.7.0 - 12.13)
 */
export class PVMAccumulationStateImpl implements PVMAccumulationState {
  /**
   * `bold d`
   */
  accounts!: DeltaImpl;
  /**
   * `bold i` - the upcoming validator keys `ι`
   */
  stagingSet!: ValidatorsImpl;
  /**
   * **`bold q`** - the authorizer queue
   */
  authQueue!: AuthorizerQueueImpl;
  /**
   * `m` - the index of the blessed service
   */
  manager!: ServiceIndex;
  /**
   * `a`
   * service which can alter φ one for each CORE
   */
  assigners!: SeqOfLength<ServiceIndex, typeof CORES>;
  /**
   * `v`
   * service which can alter ι
   */
  delegator!: ServiceIndex;
  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `z`
   */
  alwaysAccers!: Map<ServiceIndex, Gas>;
  constructor(config: ConditionalExcept<PVMAccumulationStateImpl, Function>) {
    Object.assign(this, config);
  }
}
