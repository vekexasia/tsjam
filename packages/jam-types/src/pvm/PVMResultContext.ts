import { Hash, ServiceIndex } from "@/genericTypes.js";
import { DeferredTransfer } from "@/pvm/DeferredTransfer.js";
import { PVMAccumulationState } from "./PVMAccumulationState";

/**
 * `X` in the graypaper
 * $(0.6.4 - B.7)
 *
 * NOTE:there are the following virtual computed
 * X_bold_s = X.u.delta.get(X.service)  - $(0.6.4 - B.9)
 */
export interface PVMResultContext {
  /**
   * `s`
   */
  service: ServiceIndex;

  /**
   * `u`
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
