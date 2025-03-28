import { Gas, Hash, ServiceIndex, u16, u32 } from "@/genericTypes";
import { WorkOutput } from "@/sets/WorkOutput";

/**
 * Identified by `L` set
 *
 * @see section 11.1.4
 * $(0.6.1 - 11.6)
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
   * `y` - The hash of the payload which produced this result
   * in the refine stage
   */
  payloadHash: Hash;

  /**
   * `g` -The gas prioritization **ratio**.
   */
  gasPrioritization: Gas;

  /**
   * `d` - The output of the service
   */
  output: WorkOutput;

  refineLoad: {
    /**
     * `u` - effective gas used when producing this wr in onRefine
     */
    gasUsed: Gas;

    /**
     * `i` - number imported segments
     */
    imports: u16;

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
    exports: u16;
  };
};
