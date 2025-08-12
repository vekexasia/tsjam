import { Gas, SeqOfLength, ServiceIndex } from "@/generic-types";
import { AuthorizerQueue } from "@/states/authorizer-queue";
import { Delta } from "@/states/delta";
import { Validators } from "@/validators";
import { CORES } from "@tsjam/constants";

/**
 * `S` in the graypaper
 * $(0.7.1 - 12.16)
 */
export interface PVMAccumulationState {
  /**
   * `bold d`
   */
  accounts: Delta;

  /**
   * `bold i` - the upcoming validator keys `ι`
   */
  stagingSet: Validators;

  /**
   * **`bold q`** - the authorizer queue
   */
  authQueue: AuthorizerQueue;

  /**
   * `m` - the index of the blessed service
   */
  manager: ServiceIndex;

  /**
   * `a`
   * service which can alter φ one for each CORE
   */
  assigners: SeqOfLength<ServiceIndex, typeof CORES>;

  /**
   * `v`
   * service which can alter ι
   */
  delegator: ServiceIndex;

  /**
   * `r`
   */
  registrar: ServiceIndex;

  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `z`
   */
  alwaysAccers: Map<ServiceIndex, Gas>;
}
