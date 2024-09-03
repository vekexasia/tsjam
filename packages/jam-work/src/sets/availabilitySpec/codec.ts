import { E_4, HashCodec, JamCodec } from "@vekexasia/jam-codec";
import {
  AvailabilitySpecification,
  WorkPackageHash,
} from "@vekexasia/jam-types";

/**
 *
 * `S` set member codec
 */
export const AvailabilityCodec: JamCodec<AvailabilitySpecification> = {
  encode(value: AvailabilitySpecification, bytes: Uint8Array): number {
    let offset = HashCodec.encode(value.workPackageHash, bytes.subarray(0, 32));
    offset += E_4.encode(
      BigInt(value.bundleLength),
      bytes.subarray(offset, offset + 4),
    );
    offset += HashCodec.encode(
      value.erasureRoot,
      bytes.subarray(offset, offset + 32),
    );
    offset += HashCodec.encode(
      value.segmentRoot,
      bytes.subarray(offset, offset + 32),
    );
    return offset;
  },
  decode(bytes: Uint8Array): {
    value: AvailabilitySpecification;
    readBytes: number;
  } {
    let offset = 0;
    const workPackageHash = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value as WorkPackageHash;
    offset += 32;
    const bundleLength = Number(
      E_4.decode(bytes.subarray(offset, offset + 4)).value,
    );
    offset += 4;
    const erasureRoot = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    const segmentRoot = HashCodec.decode(
      bytes.subarray(offset, offset + 32),
    ).value;
    offset += 32;
    return {
      value: {
        workPackageHash,
        bundleLength: bundleLength as AvailabilitySpecification["bundleLength"],
        erasureRoot,
        segmentRoot,
      },
      readBytes: offset,
    };
  },
  encodedSize(): number {
    return 32 + 4 + 32 + 32;
  },
};
