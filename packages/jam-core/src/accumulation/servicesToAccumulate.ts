import { ServiceIndex } from "@vekexasia/jam-types";
import { availableReports } from "@vekexasia/jam-transitions";

/**
 * `S` set
 * it is the set of all theservices which will be accumulated in this block
 * (157)
 */
export const servicesToAccumulate = (
  W: ReturnType<typeof availableReports>,
): Set<ServiceIndex> => {
  return new Set(
    W.map((w) => {
      return w.results.map((r) => r.serviceIndex);
    }).flat(),
  );
};
