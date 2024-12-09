import { Gas, Hash, ServiceIndex } from "@/genericTypes";
import { WorkOutput } from "@/sets/WorkOutput";

/**
 * Identified by `L` set
 *
 * @see section 11.1.4
 * $(0.5.2 - 11.6)
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
   */
  gasPrioritization: Gas;

  /**
   * `o` - The output of the service
   */
  output: WorkOutput;
};
