import { Gas, InvokedTransferResult } from "@tsjam/types";
import { ServiceAccountImpl } from "./ServiceAccountImpl";
import { ConditionalExcept } from "type-fest";
export class InvokedTransferResultImpl implements InvokedTransferResult {
  account!: ServiceAccountImpl;
  /**
   * `u`
   */
  gasUsed!: Gas;

  constructor(config: ConditionalExcept<InvokedTransferResultImpl, Function>) {
    Object.assign(this, config);
  }
}
