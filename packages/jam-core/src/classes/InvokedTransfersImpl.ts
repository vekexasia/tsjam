import { Gas, InvokedTransfers, ServiceIndex } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import { ServiceAccountImpl } from "./ServiceAccountImpl";

export class InvokedTransfersImpl implements InvokedTransfers {
  elements!: Map<ServiceIndex, { account: ServiceAccountImpl; gasUsed: Gas }>;
  constructor(config: ConditionalExcept<InvokedTransfersImpl, Function>) {
    Object.assign(this, config);
  }

  for(serviceIndex: ServiceIndex) {
    return this.elements.get(serviceIndex);
  }
  set(service: ServiceIndex, t: { account: ServiceAccountImpl; gasUsed: Gas }) {
    this.elements.set(service, t);
    return this;
  }
}
