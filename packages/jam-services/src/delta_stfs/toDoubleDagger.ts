import {
  Dagger,
  Delta,
  DoubleDagger,
  ServiceAccount,
  ServiceIndex,
  newSTF,
} from "@vekexasia/jam-types";
import assert from "node:assert";

type Input = {
  accummulationResult: Map<
    ServiceIndex,
    {
      // service account after accummulation
      s: ServiceAccount | undefined;
      // dictionary of newly created services
      n: Map<ServiceIndex, ServiceAccount>;
    }
  >;
};
export const deltaToDoubleDagger = newSTF<
  Dagger<Delta>,
  Input,
  DoubleDagger<Delta>
>({
  assertInputValid(input, curState) {
    // (165) in graypaper
    const allNewServices = new Set<ServiceIndex>();
    for (const service of input.accummulationResult.keys()) {
      const { n } = input.accummulationResult.get(service)!;
      for (const [newServiceIndex] of n) {
        // (165)(1)
        assert(!curState.has(newServiceIndex), "Service already exists");

        // (165)(2)
        assert(!allNewServices.has(newServiceIndex), "Service already created");
        allNewServices.add(newServiceIndex);
      }
    }
  },
  assertPStateValid() {},
  apply(input: Input, curState: Dagger<Delta>): DoubleDagger<Delta> {
    const newDelta = new Map(curState) as DoubleDagger<Delta>;

    for (const service of input.accummulationResult.keys()) {
      const { s, n } = input.accummulationResult.get(service)!;
      if (typeof s === "undefined") {
        // if service auto terminated, remove it from delta
        newDelta.delete(service);
      } else {
        // update delta with the new ServiceAccount
        newDelta.set(service, s);
      }
      if (n.size > 0) {
        // add newly created services to delta
        for (const [newServiceIndex, serviceAccount] of n) {
          newDelta.set(newServiceIndex, serviceAccount);
        }
      }
    }
    return newDelta;
  },
});
