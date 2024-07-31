import {
  BoundedSeq,
  CoreIndex,
  Hash,
  SeqOfLength,
  Tagged,
  u32,
  u64,
  UpToSeq,
} from "@/genericTypes.js";
import {
  CORES,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  MAXIMUM_WORK_ITEMS,
} from "@/consts.js";

/**
 *
 * @see section 11.1.3
 */
export type AvailabilitySpecification = {
  workPackageHash: Hash;
  bundleLength: Tagged<
    number,
    "bL",
    { maxValue: typeof MAXIMUM_AGE_LOOKUP_ANCHOR }
  >;
  /**
   * Root of the MT which function as commitment to all data for auditing the report
   */
  erasureRoot: Hash;

  /**
   * The segment-root (e) is the root of a constant-depth,
   * left-biased and zero-hash-padded binary Merkle tree committing to the hashes of each of the exported segments of
   * each work-item. These are used by guarantors to verify the
   * correctness of any reconstructed segments they are called
   * upon to import for evaluation of some later work-package.
   * It is also discussed in section 14.
   */
  segmentRoot: Hash;
};
/**
 * gives a snapshotof what was the situation when the work report was created
 */
export type RefinementContext = {
  // first block of the snapshot
  anchor: {
    headerHash: Hash;
    posteriorStateRoot: Hash;
    posteriorBeefyRoot: Hash;
  };
  // second block of the snapshot
  lookupAnchor: {
    headerHash: Hash;
    timeSlot: u32;
  };
  /**
   * it may define a required "parent" work package
   * some kind of dependency of the work package
   */
  requiredWorkPackage?: Hash;
};
export enum WorkError {
  /**
   * the work was not executed because the gas limit was reached
   * @see infinity symbol in the paper
   */
  OutOfGas = 0,

  /**
   * Possibly a program failure
   * @see lightning bolt in the paper
   */
  UnexpectedTermination = 1,

  /**
   * Service code was not available for lookup @ the lookup anchor block
   *
   * it essentially means that `WorkResult.codeHash` preimage was not found
   */
  Bad = 2,
  /**
   * Code too big (exceeded `S`)
   */
  Big = 3,
}
export type WorkOutput = Uint8Array | WorkError;

export type WorkResult = {
  serviceIndex: u32;
  codeHash: Hash;
  /**
   * The hash of the payload which produced this result
   * in the refine stage
   */
  payloadHash: Hash;
  /**
   * The gas prioritization **ratio**.
   * TODO: understand what is this.
   * There is an explanation ad 01:00:00 in the video section 10-13
   */
  gasPrioritization: u64;
  output: WorkOutput;
};

export type WorkReport = {
  workPackageSpecification: unknown;
  refinementContext: RefinementContext;
  coreIndex: CoreIndex;
  authorizerHash: Hash;
  authorizerOutput: Uint8Array;
  results: BoundedSeq<WorkResult, 1, typeof MAXIMUM_WORK_ITEMS>;
};

export type ReportingAndAvailabilityState = SeqOfLength<
  | undefined
  | {
      workReport: WorkReport;
      timeSlot: u32;
    },
  typeof CORES
>;
