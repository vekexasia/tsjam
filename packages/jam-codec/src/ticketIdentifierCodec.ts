import { JamCodec } from "@/codec.js";
import { TicketIdentifier } from "@tsjam/types";
import { OpaqueHashCodec } from "@/identity.js";
import { E } from "@/ints/e.js";
import assert from "node:assert";

/**
 * $(0.5.0 - C.27)
 */
export const TicketIdentifierCodec: JamCodec<TicketIdentifier> = {
  encode: function (value: TicketIdentifier, bytes: Uint8Array): number {
    assert(bytes.length >= this.encodedSize(value));
    let offset = OpaqueHashCodec.encode(value.id, bytes.subarray(0, 32));
    offset += E.encode(BigInt(value.attempt), bytes.subarray(offset));
    return offset;
  },
  decode: function (bytes: Uint8Array): {
    value: TicketIdentifier;
    readBytes: number;
  } {
    const decodedId = OpaqueHashCodec.decode(bytes);
    const decodedAttempt = E.decode(bytes.subarray(decodedId.readBytes));
    assert(
      decodedAttempt.value === 0n || decodedAttempt.value === 1n,
      "attempt must be 0 or 1",
    );
    return {
      value: {
        id: decodedId.value,
        attempt: Number(decodedAttempt.value) as 0 | 1,
      },
      readBytes: decodedId.readBytes + decodedAttempt.readBytes,
    };
  },
  encodedSize: function (value: TicketIdentifier): number {
    return (
      OpaqueHashCodec.encodedSize(value.id) +
      E.encodedSize(BigInt(value.attempt))
    );
  },
};
