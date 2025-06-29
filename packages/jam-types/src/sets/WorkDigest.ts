import { Gas, Hash, ServiceIndex, u16, u32 } from "@/genericTypes";
import { WorkOutput } from "@/sets/WorkOutput";

/**
 * Identified by `L` set
 * $(0.7.0 - 11.6)
 */
export type WorkDigest = {
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
   * `y` - The hash of the payload which produced this result
   * in the refine stage
   */
  payloadHash: Hash;

  /**
   * `g` -The gas
   */
  gasLimit: Gas;

  /**
   * `bold_l` - The output of the service
   */
  result: WorkOutput;

  refineLoad: {
    /**
     * `u` - effective gas used when producing this wr in onRefine
     */
    gasUsed: Gas;

    /**
     * `i` - number imported segments
     */
    importCount: u16;

    /**
     * `x`
     */
    extrinsicCount: u16;

    /**
     * `z`
     */
    extrinsicSize: u32;

    /**
     * `e` - number of exported segments
     */
    exportCount: u16;
  };
};
