import { Gas, Hash } from "@/generic-types";
import { DeferredTransfer } from "./deferred-transfer";
import { PVMAccumulationState } from "./pvm-accumulation-state";
import { PVMResultContext } from "./pvm-result-context";

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
