import { AvailabilitySpecification } from "@/sets/AvailabilitySpecification";
import { WorkContext } from "@/sets/WorkContext";
import {
  Blake2bHash,
  BoundedSeq,
  CoreIndex,
  Gas,
  Hash,
  SeqOfLength,
  Tagged,
  WorkPackageHash,
} from "@/genericTypes";
import { WorkDigest } from "@/sets/WorkDigest";
import { CORES, MAXIMUM_WORK_ITEMS } from "@tsjam/constants";
import { AccumulationQueue } from "..";

/**
 * Identified by `R` set
 * @see $(0.7.0 - 11.2)
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

/**
 * `bold R`
 * $(0.7.0 - 11.16)
 */
export type AvailableWorkReports = Tagged<WorkReport[], "available">;

/**
 * `bold R!` in the paper
 * $(0.7.0 - 12.4)
 */
export type AvailableNoPrereqWorkReports = Tagged<
  WorkReport[],
  "available-no-prerequisites"
>;

/**
 * `bold RQ` in the paper
 * $(0.7.0 - 12.5)
 */
export type AvailableWithPrereqWorkReports = Tagged<
  Array<AccumulationQueue[0][0]>,
  "available-yes-prerequisites"
>;

/**
 * `bold Q`
 * $(0.6.4 - 17.1)
 */
export type AuditRequiredWorkReports = SeqOfLength<
  WorkReport | undefined,
  typeof CORES
>;
