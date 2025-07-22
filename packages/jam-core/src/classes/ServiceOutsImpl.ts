import { Hash, ServiceIndex, ServiceOuts } from "@tsjam/types";

export class ServiceOutsImpl implements ServiceOuts {
  elements!: Set<{
    serviceIndex: ServiceIndex;
    accumulationResult: Hash;
  }>;
  public constructor(
    el: Set<{
      serviceIndex: ServiceIndex;
      accumulationResult: Hash;
    }> = new Set(),
  ) {
    this.elements = el;
  }
  add(serviceIndex: ServiceIndex, accumulationResult: Hash): void {
    this.elements.add({ serviceIndex, accumulationResult });
  }
}
