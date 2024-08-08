import {SafroleState} from "@/index.js";
import {TicketExtrinsics} from "@/extrinsics/index.js";
import {Bandersnatch} from "@vekexasia/jam-crypto";
import {TicketIdentifier} from "@vekexasia/jam-types";

// compute `n` (76)
export const computeTicketIdentifiers = (extrinsic: TicketExtrinsics): Array<TicketIdentifier>=> {
  const n: TicketIdentifier[] = [];
  for (const x of extrinsic) {
    // (76)
    n.push({
      id: Bandersnatch.vrfOutputRingProof(x.proof),
      attempt: x.entryIndex,
    });
  }
  return n;
}
export const updateGammaA = (state: SafroleState, ) => {
