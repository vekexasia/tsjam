import { ServiceAccount } from "@/sets/ServiceAccount.js";
import { SeqOfLength, ServiceIndex, u64 } from "@/genericTypes.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { ValidatorData } from "@/ValidatorData.js";
import { DeferredTransfer } from "@/pvm/DeferredTransfer.js";
import { AuthorizerQueue } from "@/states/AuthorizerQueue.js";

/**
 * `X` in the graypaper
 * (254)
 */
export interface PVMResultContext {
  /**
   * `s`
   */
  serviceAccount?: ServiceAccount;
  /**
   * `c`
   */
  c: AuthorizerQueue;
  /**
   * `v`
   */
  validatorKeys: SeqOfLength<ValidatorData, typeof NUMBER_OF_VALIDATORS>;
  /**
   * `i`
   */
  service: ServiceIndex;
  /**
   * `t`
   */
  transfers: DeferredTransfer[];
  /**
   * `n`
   */
  n: Map<ServiceIndex, ServiceAccount>;
  /**
   * `p` - privileged services
   */
  p: {
    /**
     * `m`
     */
    m: ServiceIndex;
    /**
     * `a`
     */
    a: ServiceIndex;
    /**
     * `v`
     */
    v: ServiceIndex;
    /**
     * gas limits
     */
    g: Map<ServiceIndex, u64>;
  };
}
