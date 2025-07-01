import { ServiceIndex } from "@/genericTypes";

/**
 *
 * @see section 12.1
 */
export type EP_Tuple = {
  serviceIndex: ServiceIndex;
  preimage: Uint8Array;
};

/**
 * The extrinsic payload is a sequence of tuples, each containing a service index and a preimage.
 * they must be ordered and not duplicate
 * $(0.7.0 - 12.38)
 */
export type EP_Extrinsic = Array<EP_Tuple>;
