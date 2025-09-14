import { Hash, PVMResultContext, ServiceIndex } from "@tsjam/types";
import type { PVMAccumulationStateImpl } from "./pvm-accumulation-state-impl";
import { ConditionalExcept } from "type-fest";
import type { DeferredTransfersImpl } from "../deferred-transfers-impl";
import { cloneCodecable } from "@tsjam/codec";

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
    blob: Buffer;
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

  clone() {
    return new PVMResultContextImpl({
      id: this.id,
      state: this.state.clone(),
      nextFreeID: this.nextFreeID,
      transfers: cloneCodecable(this.transfers),
      yield: this.yield,
      provisions: this.provisions.map((p) => ({
        serviceId: p.serviceId,
        blob: Buffer.concat([p.blob]),
      })),
    });
  }
}
