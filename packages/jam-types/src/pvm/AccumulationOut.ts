import { Gas, Hash } from "@/genericTypes";
import { DeferredTransfer } from "./DeferredTransfer";
import { PVMAccumulationState } from "./PVMAccumulationState";
import { PVMResultContext } from "./PVMResultContext";

/**
 * `O`
 * $(0.7.1 - 12.22)
 */
export type AccumulationOut = {
  /**
   * `bold_e'`
   */
  postState: PVMAccumulationState;
  /**
   * `bold_t`
   */
  deferredTransfers: { elements: DeferredTransfer[] };
  /**
   * `y`
   */
  yield: Hash | undefined;

  /**
   * `u`
   */
  gasUsed: Gas;

  /**
   * `bold_p`
   */
  provisions: PVMResultContext["provisions"];
};
