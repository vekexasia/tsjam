import { ServiceAccount } from "@/sets/ServiceAccount.js";
import { Hash, ServiceIndex } from "@/genericTypes.js";
import { DeferredTransfer } from "@/pvm/DeferredTransfer.js";
import { PVMAccumulationState } from "./PVMAccumulationState";

/**
 * `X` in the graypaper
 * $(0.5.4 - B.6)
 *
 * NOTE:there are the following virtual computed
 * X_bold_s = X.u.delta.get(X.service)  - $(0.5.4 - B.7)
 */
export interface PVMResultContext {
  /**
   * `d`
   */
  delta: Map<ServiceIndex, ServiceAccount>;

  /**
   * `s`
   */
  service: ServiceIndex;

  /**
   * (169)
   */
  u: PVMAccumulationState;

  /**
   * `i`
   */
  i: ServiceIndex;

  /**
   * `t`
   */
  transfer: DeferredTransfer[];

  y?: Hash;
}
