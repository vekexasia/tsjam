import {
  AccumulationOut,
  DeferredTransfer,
  Gas,
  Hash,
  PVMAccumulationState,
  ServiceIndex,
} from "@tsjam/types";
import { PVMAccumulationStateImpl } from "./PVMAccumulationStateImpl";
import { DeferredTransferImpl } from "./DeferredTransferImpl";
import { ConditionalExcept } from "type-fest";

/**
 * `O`
 * $(0.7.0 - 12.20)
 */
export class AccumulationOutImpl implements AccumulationOut {
  /**
   * `bold_e'`
   */
  postState!: PVMAccumulationStateImpl;
  /**
   * `bold_t`
   */
  deferredTransfers!: DeferredTransferImpl[];
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
  provision!: Array<{
    /**
     * `s`
     */
    service: ServiceIndex;
    /**
     * `bold_i`
     */
    preimage: Uint8Array;
  }>;

  constructor(config: ConditionalExcept<AccumulationOutImpl, Function>) {
    Object.assign(this, config);
  }
}
