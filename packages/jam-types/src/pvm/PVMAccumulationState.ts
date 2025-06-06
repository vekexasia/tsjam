import { CORES, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { PrivilegedServices } from "./PrivilegedServices";
import { Gas, SeqOfLength, ServiceIndex } from "@/genericTypes";
import { ValidatorData } from "@/ValidatorData";
import { Delta } from "@/states/Delta";
import { AuthorizerQueue } from "@/states/AuthorizerQueue";

/**
 * `U` in the graypaper
 * $(0.6.4 - 12.13)
 */
export interface PVMAccumulationState {
  delta: Delta;
  /**
   * `i` - the upcoming validator keys `ι`
   */
  validatorKeys: SeqOfLength<
    ValidatorData,
    typeof NUMBER_OF_VALIDATORS,
    string
  >;
  /**
   * `q` - the authorizer queue
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
  assign: SeqOfLength<ServiceIndex, typeof CORES>;
  /**
   * `v`
   * service which can alter ι
   */
  designate: ServiceIndex;
  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `z`
   */
  alwaysAccumulate: Map<ServiceIndex, Gas>;
}
