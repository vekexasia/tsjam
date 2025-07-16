import {
  BaseJamCodecable,
  eSubIntCodec,
  hashCodec,
  JamCodecable,
} from "@tsjam/codec";
import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";
import {
  AvailabilitySpecification,
  Hash,
  Tagged,
  u16,
  u32,
  WorkPackageHash,
} from "@tsjam/types";

// Codec is defined in: $(0.6.4 - C.22)

@JamCodecable()
export class AvailabilitySpecificationImpl
  extends BaseJamCodecable
  implements AvailabilitySpecification
{
  @hashCodec("hash")
  packageHash!: WorkPackageHash;

  @eSubIntCodec(4, "length")
  bundleLength!: Tagged<
    u32,
    "l",
    {
      maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR;
    }
  >;

  @hashCodec("erasure_root")
  erasureRoot!: Hash;

  @hashCodec("exports_root")
  segmentRoot!: Hash;

  @eSubIntCodec(2, "exports_count")
  segmentCount!: u16;
}
