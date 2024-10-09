import { ServiceAccount } from "@/sets/ServiceAccount.js";
import { ServiceIndex } from "@/genericTypes.js";
import { DeferredTransfer } from "@/pvm/DeferredTransfer.js";
import { PVMAccumulationState } from "./PVMAccumulationState";

/**
 * `X` in the graypaper
 * (272)
 *
 * X_bold_s = X_u.d[Xs]
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
}
