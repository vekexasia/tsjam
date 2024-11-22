import { AvailabilitySpecification } from "@/sets/AvailabilitySpecification";
import { RefinementContext } from "@/sets/RefinementContext";
import {
  Blake2bHash,
  BoundedSeq,
  CoreIndex,
  Hash,
  Tagged,
  WorkPackageHash,
} from "@/genericTypes";
import { WorkResult } from "@/sets/WorkResult";
import { MAXIMUM_WORK_ITEMS } from "@tsjam/constants";
import { AccumulationQueue } from "..";

/**
 * Identified by `W` set
 * @see $(0.5.0 - 11.2)
 */
export type WorkReport = {
  /**
   * `s`
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
  authorizerHash: Blake2bHash;

  /**
   * `o`
   */
  authorizerOutput: Uint8Array;

  /**
   * `l`
   */
  segmentRootLookup: Map<WorkPackageHash, Hash>;

  /**
   * `r`
   */
  results: BoundedSeq<WorkResult, 1, typeof MAXIMUM_WORK_ITEMS>;
};

/**
 * it's defined by the bold `W` in the paper
 * $(0.5.0 - 11.15)
 */
export type AvailableWorkReports = Tagged<WorkReport[], "available">;

/**
 * `W!` in the paper
 * $(0.5.0 - 12.4)
 */
export type AvailableNoPrereqWorkReports = Tagged<
  WorkReport[],
  "available-no-prerequisites"
>;

/**
 * `WQ` in the paper
 * $(0.5.0 - 12.5)
 */
export type AvailableWithPrereqWorkReports = Tagged<
  Array<AccumulationQueue[0][0]>,
  "available-yes-prerequisites"
>;
