import { Dagger, Delta, DoubleDagger, ServiceIndex } from "@tsjam/types";
import assert from "node:assert";
import { newSTF } from "@tsjam/utils";
import { accumulateInvocation } from "@tsjam/pvm";

type Input = {
  accummulationResult: Map<
    ServiceIndex,
    ReturnType<typeof accumulateInvocation>
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
  // (166) in the graypaper
  apply(input: Input, curState: Dagger<Delta>): DoubleDagger<Delta> {
    const newDelta = new Map(curState) as DoubleDagger<Delta>;

    for (const service of input.accummulationResult.keys()) {
      const { serviceAccount, n } = input.accummulationResult.get(service)!;
      if (typeof serviceAccount === "undefined") {
        // if service auto terminated, remove it from delta
        newDelta.delete(service);
      } else {
        // update delta with the new ServiceAccount
        // A(s)s if s ∈ S
        newDelta.set(service, serviceAccount);
      }
      if (n.size > 0) {
        // add newly created services to delta
        // A(t)n[s] if ∃!t ∶ t ∈ S, s ∈ K(A(t)n)
        for (const [newServiceIndex, serviceAccount] of n) {
          newDelta.set(newServiceIndex, serviceAccount);
        }
      }
    }
    return newDelta;
  },
});
