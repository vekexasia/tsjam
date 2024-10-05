import { availableReports } from "@tsjam/transitions";
import { Delta, DoubleDagger, ServiceIndex } from "@tsjam/types";
import assert from "node:assert";
import { MAX_GAS_ACCUMULATION } from "@tsjam/constants";

/**
 * (158) `G` in the paper
 * @param serviceIndex - the service index to calculate the gas for
 * @param W - available reports
 * @param dd_delta - delta double dagger
 */
export const gasAccounting = (
  serviceIndex: ServiceIndex,
  W: ReturnType<typeof availableReports>,
  dd_delta: DoubleDagger<Delta>,
): bigint => {
  const dd = dd_delta.get(serviceIndex)!;
  assert(typeof dd !== "undefined", "service unknown to delta");
  return W.reduce((acc, w) => {
    const allResGas = w.results.reduce(
      (acc, r) => r.gasPrioritization + acc,
      0n,
    );

    const minGasSum = w.results.reduce((acc, r) => {
      const dd = dd_delta.get(r.serviceIndex)!;
      assert(typeof dd !== "undefined", "service unknown to delta");
      return acc + dd.minGasAccumulate;
    }, 0n);

    return (
      acc +
      w.results.reduce((acc2, r) => {
        if (r.serviceIndex !== serviceIndex) {
          return acc2;
        }
        return (
          acc2 +
          (r.gasPrioritization * (MAX_GAS_ACCUMULATION - minGasSum)) / allResGas
        );
      }, 0n)
    );
  }, 0n);
};
