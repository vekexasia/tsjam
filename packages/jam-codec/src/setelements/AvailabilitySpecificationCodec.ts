import { AvailabilitySpecification, WorkPackageHash, u16 } from "@tsjam/types";
import { JamCodec } from "@/codec.js";
import { HashCodec } from "@/identity.js";
import { E_2_int, E_4 } from "@/ints/E_subscr.js";

/**
 *
 * `S` set member codec
 * $(0.5.0 - C.22)
 */
export const AvailabilitySpecificationCodec: JamCodec<AvailabilitySpecification> =
  {
    encode(value: AvailabilitySpecification, bytes: Uint8Array): number {
      let offset = HashCodec.encode(
        value.workPackageHash,
        bytes.subarray(0, 32),
      );
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
      offset += E_2_int.encode(
        value.segmentCount,
        bytes.subarray(offset, offset + 2),
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
      const segmentCount = E_2_int.decode(bytes.subarray(offset, offset + 2))
        .value as u16;
      offset += 2;
      return {
        value: {
          workPackageHash,
          bundleLength:
            bundleLength as AvailabilitySpecification["bundleLength"],
          erasureRoot,
          segmentRoot,
          segmentCount,
        },
        readBytes: offset,
      };
    },
    encodedSize(): number {
      return 32 + 4 + 32 + 32 + 2;
    },
  };
