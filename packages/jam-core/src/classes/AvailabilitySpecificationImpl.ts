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
import { ConditionalExcept } from "type-fest";

/**
 * identified by `Y` set
 * $(0.7.1 - 11.5)
 * $(0.7.1 - C.25) | codec
 */
@JamCodecable()
export class AvailabilitySpecificationImpl
  extends BaseJamCodecable
  implements AvailabilitySpecification
{
  /**
   * `p`
   */
  @hashCodec("hash")
  packageHash!: WorkPackageHash;

  /**
   * `l`
   */
  @eSubIntCodec(4, "length")
  bundleLength!: Tagged<
    u32,
    "l",
    {
      maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR;
    }
  >;

  /**
   * `u` -
   */
  @hashCodec("erasure_root")
  erasureRoot!: Hash;

  /**
   * `e`
   */
  @hashCodec("exports_root")
  segmentRoot!: Hash;

  /**
   * `n`
   * Exported segment count
   */
  @eSubIntCodec(2, "exports_count")
  segmentCount!: u16;

  constructor(
    config: ConditionalExcept<AvailabilitySpecificationImpl, Function>,
  ) {
    super();
    Object.assign(this, config);
  }
}
