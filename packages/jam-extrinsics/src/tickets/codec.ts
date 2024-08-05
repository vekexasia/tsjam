import { TicketExtrinsics } from "@/tickets/extrinsic.js";
import { createArrayLengthDiscriminator } from "@vekexasia/jam-codec";
import { RingVRFProof } from "@vekexasia/jam-types";

export const codecEt = createArrayLengthDiscriminator<TicketExtrinsics[0]>({
  encode(
    value: { entryIndex: 0 | 1; proof: RingVRFProof },
    bytes: Uint8Array,
  ): number {
    bytes[0] = value.entryIndex;
    bytes.set(value.proof, 1);
    return 1 + value.proof.length;
  },
  decode(bytes: Uint8Array): {
    value: { entryIndex: 0 | 1; proof: RingVRFProof };
    readBytes: number;
  } {
    return {
      value: {
        entryIndex: bytes[0] as 0 | 1,
        proof: bytes.subarray(1) as RingVRFProof,
      },
      readBytes: 1 + bytes.length,
    };
  },
  encodedSize: function (value: {
    entryIndex: 0 | 1;
    proof: RingVRFProof;
  }): number {
    return 1 + value.proof.length;
  },
});
