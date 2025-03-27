import { AvailabilitySpecification } from "@/sets/AvailabilitySpecification";
import { RefinementContext } from "@/sets/RefinementContext";
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
import { WorkResult } from "@/sets/WorkResult";
import { CORES, MAXIMUM_WORK_ITEMS } from "@tsjam/constants";
import { AccumulationQueue } from "..";

/**
 * Identified by `W` set
 * @see $(0.6.4 - 11.2)
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

  /**
   * `g`
   */
  authGasUsed: Gas;
};

/**
 * it's defined by the bold `W` in the paper
 * $(0.6.1 - 11.16)
 */
export type AvailableWorkReports = Tagged<WorkReport[], "available">;

/**
 * `W!` in the paper
 * $(0.6.1 - 12.4)
 */
export type AvailableNoPrereqWorkReports = Tagged<
  WorkReport[],
  "available-no-prerequisites"
>;

/**
 * `WQ` in the paper
 * $(0.6.1 - 12.5)
 */
export type AvailableWithPrereqWorkReports = Tagged<
  Array<AccumulationQueue[0][0]>,
  "available-yes-prerequisites"
>;

/**
 * `bold Q`
 * $(0.6.1 - 17.1)
 */
export type AuditRequiredWorkReports = SeqOfLength<
  WorkReport | undefined,
  typeof CORES
>;
