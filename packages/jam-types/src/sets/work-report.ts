import {
  Blake2bHash,
  BoundedSeq,
  CoreIndex,
  Gas,
  Hash,
  WorkPackageHash,
} from "@/generic-types";
import { AvailabilitySpecification } from "@/sets/availability-specification";
import { WorkContext } from "@/sets/work-context";
import { WorkDigest } from "@/sets/work-digest";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";

/**
 * Identified by `R` set
 * @see $(0.7.1 - 11.2)
 */
export type WorkReport = {
  /**
   * `bold_s`
   */
  avSpec: AvailabilitySpecification;

  /**
   * `bold_c`
   */
  context: WorkContext;

  /**
   * `c`
   */
  core: CoreIndex;

  /**
   * `a`
   */
  authorizerHash: Blake2bHash;

  /**
   * `bold_t`
   */
  authTrace: Uint8Array;

  /**
   * `bold_l`
   */
  srLookup: Map<WorkPackageHash, Hash>;

  /**
   * `bold_d`
   */
  digests: BoundedSeq<WorkDigest, 1, typeof MAXIMUM_WORK_ITEMS>;

  /**
   * `g`
   */
  authGasUsed: Gas;
};
