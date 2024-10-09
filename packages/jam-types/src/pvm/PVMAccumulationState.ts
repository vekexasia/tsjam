import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { PrivilegedServices } from "./PrivilegedServices";
import { SeqOfLength } from "@/genericTypes";
import { ValidatorData } from "@/ValidatorData";
import { Delta } from "@/states/Delta";
import { AuthorizerQueue } from "@/states/AuthorizerQueue";

/**
 * `U` in the graypaper
 * (169)
 */
export interface PVMAccumulationState {
  delta: Delta;
  /**
   * `i` - the upcoming validator keys `ι`
   */
  validatorKeys: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS>;
  /**
   * `q` - the authorizer queue
   */
  authQueue: AuthorizerQueue;
  /**
   * `x` - privileged Services
   */
  privServices: PrivilegedServices;
}
