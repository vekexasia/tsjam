import { Hash, Tagged, WorkPackageHash, u16, u32 } from "@/genericTypes";
import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";

/**
 * identified by `Y` set
 * $(0.7.0 - 11.5)
 */
export type AvailabilitySpecification = {
  /**
   * `p`
   */
  packageHash: WorkPackageHash;

  /**
   * `l`
   */
  bundleLength: Tagged<
    u32,
    "l",
    { maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR }
  >;

  /**
   * `u` -
   */
  erasureRoot: Hash;

  /**
   * `e`
   */
  segmentRoot: Hash;

  /**
   * `n`
   * Exported segment count
   */
  segmentCount: u16;
};
