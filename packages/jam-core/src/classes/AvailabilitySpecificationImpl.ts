import {
  BaseJamCodecable,
  createJSONCodec,
  E_2_int,
  E_4_int,
  HashCodec,
  HashJSONCodec,
  JamCodecable,
  JamProperty,
  NumberJSONCodec,
  WorkPackageHashCodec,
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
  extends BaseJamCodecable<AvailabilitySpecificationImpl>
  implements AvailabilitySpecification
{
  @JamProperty(WorkPackageHashCodec, HashJSONCodec(), "hash")
  packageHash!: WorkPackageHash;

  @JamProperty(E_4_int, NumberJSONCodec(), "length")
  bundleLength!: Tagged<
    u32,
    "l",
    {
      maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR;
    }
  >;

  @JamProperty(HashCodec, HashJSONCodec(), "erasure_root")
  erasureRoot!: Hash;

  @JamProperty(HashCodec, HashJSONCodec(), "exports_root")
  segmentRoot!: Hash;

  @JamProperty(E_2_int, NumberJSONCodec(), "exports_count")
  segmentCount!: u16;
}
