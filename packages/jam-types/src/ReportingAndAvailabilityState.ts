import {
  BoundedSeq,
  CoreIndex,
  Hash,
  SeqOfLength,
  ServiceIndex,
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
 * identified by `S` set
 * @see section 11.1.3
 */
export type AvailabilitySpecification = {
  /**
   * `h`
   */
  workPackageHash: Hash;
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
};
/**
 * gives a snapshotof what was the situation when the work report was created
 * defined by `X` set
 * @see section 11.1.2
 */
export type RefinementContext = {
  // first block of the snapshot
  anchor: {
    /**
     * `a` header hash
     */
    headerHash: Hash;
    /**
     * `s`
     */
    posteriorStateRoot: Hash;
    /**
     * `b`
     */
    posteriorBeefyRoot: Hash;
  };
  // second block of the snapshot
  lookupAnchor: {
    /**
     * `l`
     */
    headerHash: Hash;
    /**
     * `t`
     */
    timeSlot: u32;
  };
  /**
   * `p`
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

/**
 * Identified by `L` set
 *
 * @see section 11.1.4
 */
export type WorkResult = {
  /**
   * `s`
   * the index of service whose state is to be altered
   */
  serviceIndex: ServiceIndex;

  /**
   * `c` - the hash of the code of the sevice at the time of being reported
   * it must be predicted within the work-report according to (153)
   */
  codeHash: Hash;
  /**
   * `l` - The hash of the payload (l) which produced this result
   * in the refine stage
   */
  payloadHash: Hash;
  /**
   * `g` -The gas prioritization **ratio**.
   * TODO: understand what is this.
   * There is an explanation ad 01:00:00 in the video section 10-13
   */
  gasPrioritization: u64;
  /**
   * `o` - The output of the service
   */
  output: WorkOutput;
};
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

/**
 * `ρ`
 * (118)
 */
export type RHO = SeqOfLength<
  { workReport: WorkReport; reportTime: u32 } | null,
  typeof CORES
>;

export type ReportingAndAvailabilityState = SeqOfLength<
  | undefined
  | {
      workReport: WorkReport;
      timeSlot: u32;
    },
  typeof CORES
>;
