import { JamCodec } from "@/codec.js";
import { JamHeader } from "@vekexasia/jam-types";
import { LittleEndian } from "@/ints/littleEndian.js";
import { Optional } from "@/optional.js";
import { HashCodec } from "@/identity.js";
const opthashcodec = new Optional(HashCodec);
export class UnsignedHeaderCodec implements JamCodec<JamHeader> {
  decode(bytes: Uint8Array): { value: JamHeader; readBytes: number } {
    return undefined;
  }

  encode(value: JamHeader, bytes: Uint8Array): number {
    let offset = 0;
    offset += HashCodec.encode(
      value.previousHash,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.priorStateRoot,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.extrinsicHash,
      bytes.subarray(offset, offset + 32),
    );

    offset += LittleEndian.encode(
      BigInt(value.timeSlotIndex),
      bytes.subarray(offset, offset + 4),
    );

    opthashcodec.encode(
      value.extrinsicRoot,
      bytes.subarray(offset, offset + 32),
    );
  }

  encodedSize(value: JamHeader): number {
    return 0;
  }
}
