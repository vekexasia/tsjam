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
    const encodedValue = E.decode(bytes);
    if (encodedValue.value === 0n) {
      return LengthDiscrimantedIdentity.decode(
        bytes.subarray(encodedValue.readBytes),
      );
    }
    switch (encodedValue.value) {
      case 1n:
        return { value: WorkError.OutOfGas, readBytes: encodedValue.readBytes };
      case 2n:
        return {
          value: WorkError.UnexpectedTermination,
          readBytes: encodedValue.readBytes,
        };
      case 3n:
        return { value: WorkError.Bad, readBytes: encodedValue.readBytes };
      case 4n:
        return { value: WorkError.Big, readBytes: encodedValue.readBytes };
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
