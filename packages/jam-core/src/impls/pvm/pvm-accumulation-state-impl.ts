import { CORES } from "@tsjam/constants";
import {
  Gas,
  PVMAccumulationState,
  SeqOfLength,
  ServiceIndex,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import type { AuthorizerQueueImpl } from "../authorizer-queue-impl";
import type { DeltaImpl } from "../delta-impl";
import type { ValidatorsImpl } from "../validators-impl";
import { toTagged } from "@tsjam/utils";
import { cloneCodecable } from "@tsjam/codec";

/**
 * `S` in the graypaper
 * $(0.7.1 - 12.16)
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
   * `r`
   */
  registrar!: ServiceIndex;

  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `z`
   */
  alwaysAccers!: Map<ServiceIndex, Gas>;
  constructor(config: ConditionalExcept<PVMAccumulationStateImpl, Function>) {
    Object.assign(this, config);
  }

  clone(): PVMAccumulationStateImpl {
    return new PVMAccumulationStateImpl({
      accounts: this.accounts.clone(),
      stagingSet: cloneCodecable(this.stagingSet),
      authQueue: cloneCodecable(this.authQueue),
      manager: this.manager,
      assigners: toTagged([...this.assigners]),
      delegator: this.delegator,
      registrar: this.registrar,
      alwaysAccers: new Map(this.alwaysAccers),
    });
  }
}
