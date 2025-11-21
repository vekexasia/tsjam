import { AccumulationOut, Gas, Hash } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import type { DeferredTransfersImpl } from "./deferred-transfers-impl";
import { PreimageElement } from "./extrinsics/preimages";
import type { PVMAccumulationStateImpl } from "./pvm/pvm-accumulation-state-impl";

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
  provisions!: Array<PreimageElement>;

  constructor(config: ConditionalExcept<AccumulationOutImpl, Function>) {
    Object.assign(this, config);
  }
}
