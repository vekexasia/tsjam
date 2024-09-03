import {
  BoundedSeq,
  CoreIndex,
  Hash,
  MAXIMUM_WORK_ITEMS,
} from "@vekexasia/jam-types";
import {
  AvailabilitySpecification,
  RefinementContext,
  WorkResult,
} from "@/sets/index.js";

/**
 * Identified by `W` set
 * @see section 11.1.1
 */
export type WorkReport = {
  /**
   * identified as `s` in the paper
   */
  workPackageSpecification: AvailabilitySpecification;
  /**
   * `x`
   */
  refinementContext: RefinementContext;
  /**
   * `c`
   */
  coreIndex: CoreIndex;
  /**
   * `a`
   */
  authorizerHash: Hash;
  /**
   * `o`
   */
  authorizerOutput: Uint8Array;
  /**
   * `r`
   */
  results: BoundedSeq<WorkResult, 1, typeof MAXIMUM_WORK_ITEMS>;
};
