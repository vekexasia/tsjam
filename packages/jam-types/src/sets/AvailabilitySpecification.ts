import { Hash, Tagged, WorkPackageHash, u16 } from "@/genericTypes";
import { MAXIMUM_AGE_LOOKUP_ANCHOR } from "@tsjam/constants";

/**
 * identified by `S` set
 * @see section 11.1.3
 */
export type AvailabilitySpecification = {
  /**
   * `h`
   */
  workPackageHash: WorkPackageHash;
  /**
   * `l`
   * @see section 14.4.1
   */
  bundleLength: Tagged<
    number,
    "l",
    { maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR }
  >;
  /**
   * `u` -
   * Root of the MT which function as commitment to all data for auditing the report
   */
  erasureRoot: Hash;

  /**
   * `e`
   * The segment-root (e) is the root of a constant-depth,
   * left-biased and zero-hash-padded binary Merkle tree committing to the hashes of each of the exported segments of
   * each work-item. These are used by guarantors to verify the
   * correctness of any reconstructed segments they are called
   * upon to import for evaluation of some later work-package.
   * It is also discussed in section 14.
   */
  segmentRoot: Hash;

  /**
   * Exported segment count
   */
  segmentCount: u16;
};
