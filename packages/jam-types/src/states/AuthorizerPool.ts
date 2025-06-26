import { Hash, SeqOfLength, UpToSeq } from "@/genericTypes.js";
import { AUTHPOOL_SIZE, CORES } from "@tsjam/constants";

/**
 * `α`
 * it gets populated by the authorizer queue.
 * for each block:
 * - if there is a workreport is being submitted, then the pool new value would be (pool - workreport) + AuthorizerQueue[coreIndex][Ht] modulo 80
 * - if there is no workreport, then the pool new value would be (pool + AuthorizerQueue[coreIndex][Ht]) modulo 80
 * after this operation, we take the resulting array and keep the last 8 elements
 * we need to remove the leftmost authorizer from the pool that matches the workreport submitted
 * $(0.7.0 - 8.1)
 */
export type AuthorizerPool = SeqOfLength<
  UpToSeq<Hash, typeof AUTHPOOL_SIZE>,
  typeof CORES
>;
