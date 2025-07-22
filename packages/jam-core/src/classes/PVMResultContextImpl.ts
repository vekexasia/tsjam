import { Hash, PVMResultContext, ServiceIndex } from "@tsjam/types";
import { DeferredTransferImpl } from "./DeferredTransferImpl";
import { PVMAccumulationStateImpl } from "./PVMAccumulationStateImpl";
import { ConditionalExcept } from "type-fest";
import { ServiceAccountImpl } from "./ServiceAccountImpl";

/**
 * `X` in the graypaper
 * $(0.6.4 - B.7)
 */
export class PVMResultContextImpl implements PVMResultContext {
  /**
   * `s`
   */
  service!: ServiceIndex;
  /**
   * `u`
   */
  u!: PVMAccumulationStateImpl;
  /**
   * `i`
   */
  i!: ServiceIndex;
  /**
   * `t`
   */
  transfer!: DeferredTransferImpl[];
  y!: Hash | undefined;
  /**
   * `p`
   */
  preimages!: Array<{
    /**
     * `s`
     */
    service: ServiceIndex;
    /**
     * `bold_i`
     */
    preimage: Uint8Array;
  }>;

  constructor(config: ConditionalExcept<PVMResultContextImpl, Function>) {
    Object.assign(this, config);
  }

  /**
   * $(0.6.4 - B.9)
   */
  boldS(service: ServiceIndex = this.service): ServiceAccountImpl | undefined {
    return this.u.accounts.get(service);
  }
}
