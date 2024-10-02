import { accumulate } from "@/accumulation/accumulate.js";

export const beefyCommitment = (
  accResults: ReturnType<typeof accumulate>[],
) => {
  // compute C set
  return new Set(
    accResults.map((accResult) => {
      return {
        service: accResult.service,
        reportHash: accResult.r!,
      };
    }),
  );
};
