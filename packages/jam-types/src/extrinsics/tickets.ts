import { RingVRFProof, UpToSeq } from "@/genericTypes.js";

export type TicketsExtrinsicElement = {
  /**
   * `r`
   */
  attempt: 0 | 1;
  /**
   * `p`
   */
  proof: RingVRFProof;
};
/**
 *
 * `Et` the maximum number of tickets in a block is
 * `K`=16 and it is allowed to be submitted only if current slot is less than Y=500 ( aka lottery did not end yet)
 * $(0.7.1 - 6.29)
 */
export type TicketsExtrinsic = {
  elements: UpToSeq<TicketsExtrinsicElement, 16>;
};
