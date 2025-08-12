import { ServiceIndex } from "@/generic-types";

/**
 *
 * @see section 12.1
 */
export type EP_Tuple = {
  requester: ServiceIndex;
  blob: Uint8Array;
};

/**
 * The extrinsic payload is a sequence of tuples, each containing a service index and a preimage.
 * they must be ordered and not duplicate
 * $(0.7.1 - 12.33)
 */
export type EP_Extrinsic = { elements: Array<EP_Tuple> };
