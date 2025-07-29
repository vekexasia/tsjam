import { Hash, PVMResultContext, ServiceIndex } from "@tsjam/types";
import { PVMAccumulationStateImpl } from "./PVMAccumulationStateImpl";
import { ConditionalExcept } from "type-fest";
import { DeferredTransfersImpl } from "../DeferredTransfersImpl";

/**
 * `L` in the graypaper
 * $(0.7.1 - B.7)
 *
 */
export class PVMResultContextImpl implements PVMResultContext {
  /**
   * `s`
   */
  id!: ServiceIndex;
  /**
   * `bold e`
   */
  state!: PVMAccumulationStateImpl;
  /**
   * `i`
   */
  nextFreeID!: ServiceIndex;
  /**
   * `bold_t`
   */
  transfers!: DeferredTransfersImpl;
  /**
   * `y`
   */
  yield!: Hash | undefined;
  /**
   * `p`
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

  constructor(config: ConditionalExcept<PVMResultContextImpl, Function>) {
    Object.assign(this, config);
  }

  /**
   * $(0.7.1 - B.8)
   */
  bold_s() {
    return this.state.accounts.get(this.id)!;
  }
}
