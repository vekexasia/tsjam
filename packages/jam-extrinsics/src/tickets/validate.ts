import { TicketExtrinsics } from "@/tickets/extrinsic.js";

export const validateTicketExtrinsic = (extrinsic: TicketExtrinsics) => {
  if (extrinsic.length > 16) {
    throw new Error("Extrinsic length must be less than 16");
  }
  for (const ext of extrinsic) {
    if (ext.entryIndex !== 0 && ext.entryIndex !== 1) {
      throw new Error("Entry index must be 0 or 1");
    }
  }
  // TODO: Validate RingVRFProof
};
