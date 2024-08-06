import { JamCodec } from "@/codec.js";
import {
  ServiceIndex,
  u64,
  WorkError,
  WorkOutput,
  WorkResult,
} from "@vekexasia/jam-types";
import { E_4, E_8 } from "@/ints/E_subscr.js";
import { E } from "@/ints/e.js";
import { HashCodec } from "@/identity.js";
import { LengthDiscrimantedIdentity } from "@/lengthdiscriminated/lengthDiscriminator.js";
const workOutputCodec: JamCodec<WorkOutput> = {
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
export const LMemberCodec: JamCodec<WorkResult> = {
  encode(value: WorkResult, bytes: Uint8Array): number {
    let offset = E_4.encode(BigInt(value.serviceIndex), bytes.subarray(0, 4));
    offset += HashCodec.encode(
      value.codeHash, // c
      bytes.subarray(offset, offset + 32),
    );

    offset += HashCodec.encode(
      value.payloadHash, // l
      bytes.subarray(offset, offset + 32),
    );

    offset += E_8.encode(
      value.gasPrioritization, // g
      bytes.subarray(offset, offset + 8),
    );

    offset += workOutputCodec.encode(value.output, bytes.subarray(offset));
    return offset;
  },
  decode(bytes: Uint8Array): { value: WorkResult; readBytes: number } {
    let offset = 0;
    const serviceIndex = Number(
      E_4.decode(bytes.subarray(offset, offset + 4)).value,
    ) as ServiceIndex;
    offset += 4;
    const codeHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const payloadHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const gasPrioritization = E_8.decode(bytes.subarray(offset, offset + 8))
      .value as u64;
    offset += 8;
    const output = workOutputCodec.decode(bytes.subarray(offset));
    offset += output.readBytes;
    return {
      value: {
        serviceIndex,
        codeHash,
        payloadHash,
        gasPrioritization,
        output: output.value,
      },
      readBytes: offset,
    };
  },
  encodedSize(value: WorkResult): number {
    return 4 + 32 + 32 + 8 + workOutputCodec.encodedSize(value.output);
  },
};
