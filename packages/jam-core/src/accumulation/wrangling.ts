import { PVMAccumulationOp, ServiceIndex } from "@tsjam/types";
import { availableReports } from "@tsjam/transitions";

/**
 * Computes according to (160) the operations to accumulate for the pvm
 * the result will be used inthe accumulation invocation
 * @param serviceIndex - the service to accumulate
 * @param W - available reports
 * @returns the operations to accumulate
 */
export const computeAccumulationOPs = (
  serviceIndex: ServiceIndex,
  W: ReturnType<typeof availableReports>,
): PVMAccumulationOp[] => {
  const toAccumulate: PVMAccumulationOp[] = [];
  W.forEach((w) => {
    w.results.forEach((r) => {
      if (r.serviceIndex === serviceIndex) {
        toAccumulate.push({
          output: r.output,
          payloadHash: r.payloadHash,
          packageHash: w.workPackageSpecification.workPackageHash,
          authorizationOutput: w.authorizerOutput,
        });
      }
    });
  });
  return toAccumulate;
};
