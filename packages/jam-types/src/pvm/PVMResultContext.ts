import { ServiceAccount } from "@/sets/ServiceAccount.js";
import { Hash, SeqOfLength, ServiceIndex } from "@/genericTypes.js";
import {
  AUTHQUEUE_MAX_SIZE,
  CORES,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-constants";
import { ValidatorData } from "@/ValidatorData.js";

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
   * `c` asically the AuthorizerQueue
   */
  c: SeqOfLength<SeqOfLength<Hash, typeof AUTHQUEUE_MAX_SIZE>, typeof CORES>;
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
  transfers: any; // todo
  /**
   * `n`
   */
  n: Map<ServiceIndex, ServiceAccount>;

  p: {
    /**
     * `m`
     */
    m: ServiceAccount;
    /**
     * `a`
     */
    a: ServiceIndex;
    /**
     * `v`
     */
    v: ServiceIndex;
  };
}
