import { Hash, ServiceIndex } from "@/genericTypes.js";
import { DeferredTransfer, DeferredTransfers } from "@/pvm/DeferredTransfer.js";
import { PVMAccumulationState } from "./PVMAccumulationState";

/**
 * `L` in the graypaper
 * $(0.7.1 - B.7)
 *
 * NOTE:there are the following virtual computed
 * X_bold_s = X.u.delta.get(X.service)  - $(0.7.1 - B.8)
 */
export interface PVMResultContext {
  /**
   * `s`
   */
  id: ServiceIndex;
  /**
   * `bold e`
   */
  state: PVMAccumulationState;
  /**
   * `i`
   */
  nextFreeID: ServiceIndex;
  /**
   * `bold_t`
   */
  transfers: DeferredTransfers;

  /**
   * `y`
   */
  yield: Hash | undefined;

  /**
   * `p`
   */
  provisions: Array<{
    /**
     * `s`
     */
    serviceId: ServiceIndex;
    /**
     * `bold_i`
     */
    blob: Uint8Array;
  }>;
}
