import { Hash, SeqOfLength } from "@/genericTypes.js";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";

// [ [H]Q ]C
/**
 * `φ` (84)
 */
export type AuthorizerQueue = SeqOfLength<
  SeqOfLength<Hash, typeof AUTHQUEUE_MAX_SIZE>,
  typeof CORES
>;
