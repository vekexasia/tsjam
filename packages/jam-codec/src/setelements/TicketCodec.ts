import { JamCodec } from "@/codec.js";
import { Ticket } from "@tsjam/types";
import { HashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";

/**
 * `C` set member codec
 */
export const TicketCodec: JamCodec<Ticket> = {
  encode(value: Ticket, bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.identifier, bytes);
    offset += E.encode(BigInt(value.entryIndex), bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array) {
    let offset = 0;
    const identifier = HashCodec.decode(bytes.subarray(offset));
    offset += identifier.readBytes;
    const entryIndex = E.decode(bytes.subarray(offset));
    offset += entryIndex.readBytes;
    return {
      value: {
        identifier: identifier.value,
        entryIndex: Number(entryIndex.value) as 0 | 1,
      },
      readBytes: offset,
    };
  },
  encodedSize(v: Ticket): number {
    return 32 + E.encodedSize(BigInt(v.entryIndex));
  },
};
