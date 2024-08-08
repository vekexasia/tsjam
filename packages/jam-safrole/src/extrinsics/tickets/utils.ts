// compute `n` (76)
import { TicketExtrinsics } from "@/extrinsics/index.js";
import { TicketIdentifier } from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";

export const computeTicketIdentifiers = (
  extrinsic: TicketExtrinsics,
): Array<TicketIdentifier> => {
  const n: TicketIdentifier[] = [];
  for (const x of extrinsic) {
    // (76)
    n.push({
      id: Bandersnatch.vrfOutputRingProof(x.proof),
      attempt: x.entryIndex,
    });
  }
  return n;
};
