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

  static union(a: ServiceOuts, b: ServiceOuts): ServiceOutsImpl {
    // TODO: no checks are performed on duplicated elements despite using Set
    return new ServiceOutsImpl(new Set([...a.elements, ...b.elements]));
  }
}
