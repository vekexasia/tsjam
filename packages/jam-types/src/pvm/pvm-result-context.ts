import { Hash, ServiceIndex } from "@/generic-types";
import { DeferredTransfers } from "@/pvm/deferred-transfer";
import { PVMAccumulationState } from "./pvm-accumulation-state";

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
    requester: ServiceIndex;
    /**
     * `bold_i`
     */
    blob: Uint8Array;
  }>;
}
