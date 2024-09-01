import { E, JamCodec, LengthDiscrimantedIdentity } from "@vekexasia/jam-codec";
import { WorkError, WorkOutput } from "@/sets/workOutput/type.js";

export const WorkOutputCodec: JamCodec<WorkOutput> = {
  encode(value: WorkOutput, bytes: Uint8Array): number {
    let offset = 0;
    if (value instanceof Uint8Array) {
      offset = E.encode(0n, bytes);
      offset += LengthDiscrimantedIdentity.encode(
        value,
        bytes.subarray(offset),
      );
    } else {
      switch (value) {
        case WorkError.OutOfGas:
          offset = E.encode(1n, bytes);
          break;
        case WorkError.UnexpectedTermination:
          offset = E.encode(2n, bytes);
          break;
        case WorkError.Bad:
          offset = E.encode(3n, bytes);
          break;
        case WorkError.Big:
          offset = E.encode(4n, bytes);
          break;
      }
    }
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkOutput; readBytes: number } {
    if (bytes[0] === 0) {
      const r = LengthDiscrimantedIdentity.decode(bytes.subarray(1));
      return { value: r.value, readBytes: r.readBytes + 1 };
    }
    switch (bytes[0]) {
      case 1:
        return { value: WorkError.OutOfGas, readBytes: 1 };
      case 2:
        return {
          value: WorkError.UnexpectedTermination,
          readBytes: 1,
        };
      case 3:
        return { value: WorkError.Bad, readBytes: 1 };
      case 4:
        return { value: WorkError.Big, readBytes: 1 };
    }
    throw new Error("Invalid value");
  },
  encodedSize(value: WorkOutput): number {
    if (value instanceof Uint8Array) {
      return E.encodedSize(0n) + LengthDiscrimantedIdentity.encodedSize(value);
    }
    return E.encodedSize(1n);
  },
};
