import { AccumulationOut, Gas, Hash, ServiceIndex } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { DeferredTransfersImpl } from "./DeferredTransfersImpl";
import { PVMAccumulationStateImpl } from "./pvm/PVMAccumulationStateImpl";

/**
 * `O`
 * $(0.7.1 - 12.22)
 */
export class AccumulationOutImpl implements AccumulationOut {
  /**
   * `bold_e'`
   */
  postState!: PVMAccumulationStateImpl;
  /**
   * `bold_t`
   */
  deferredTransfers!: DeferredTransfersImpl;
  /**
   * `y`
   */
  yield!: Hash | undefined;
  /**
   * `u`
   */
  gasUsed!: Gas;
  /**
   * `bold_p`
   */
  provisions!: Array<{
    /**
     * `s`
     */
    serviceId: ServiceIndex;
    /**
     * `bold_i`
     */
    blob: Uint8Array;
  }>;

  constructor(config: ConditionalExcept<AccumulationOutImpl, Function>) {
    Object.assign(this, config);
  }
}
