import { Hash, ServiceIndex, u64 } from "@vekexasia/jam-types";
import { WorkOutput } from "@/sets/workOutput/type.js";

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
