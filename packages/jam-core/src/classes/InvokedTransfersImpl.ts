import { InvokedTransfers, ServiceIndex } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { InvokedTransferResultImpl } from "./InvokedTransferResultImpl";

export class InvokedTransfersImpl implements InvokedTransfers {
  elements!: Map<ServiceIndex, InvokedTransferResultImpl>;
  constructor(config: ConditionalExcept<InvokedTransfersImpl, Function>) {
    Object.assign(this, config);
  }

  for(serviceIndex: ServiceIndex) {
    return this.elements.get(serviceIndex);
  }

  set(service: ServiceIndex, result: InvokedTransferResultImpl) {
    this.elements.set(service, result);
    return this;
  }
}
