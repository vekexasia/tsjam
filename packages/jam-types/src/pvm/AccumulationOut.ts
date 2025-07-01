import { Gas, Hash } from "@/genericTypes";
import { DeferredTransfer } from "./DeferredTransfer";
import { PVMAccumulationState } from "./PVMAccumulationState";
import { PVMResultContext } from "./PVMResultContext";

/**
 * `O`
 * $(0.7.0 - 12.20)
 */
export type AccumulationOut = {
  /**
   * `bold_e'`
   */
  postState: PVMAccumulationState;
  /**
   * `bold_t`
   */
  deferredTransers: DeferredTransfer[];
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
  provision: PVMResultContext["preimages"];
};
