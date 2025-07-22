import { Gas, SeqOfLength, ServiceIndex } from "@/genericTypes";
import { AuthorizerQueue } from "@/states/AuthorizerQueue";
import { Delta } from "@/states/Delta";
import { Validators } from "@/Validators";
import { CORES } from "@tsjam/constants";

/**
 * `S` in the graypaper
 * $(0.7.0 - 12.13)
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
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `z`
   */
  alwaysAccers: Map<ServiceIndex, Gas>;
}
