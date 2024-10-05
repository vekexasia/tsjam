import { Hash, SeqOfLength, UpToSeq } from "@/genericTypes.js";
import { AUTHPOOL_SIZE, CORES } from "@tsjam/constants";

// [ H:O ]C
/**
 * `α` (84)
 */
export type AuthorizerPool = SeqOfLength<
  UpToSeq<Hash, typeof AUTHPOOL_SIZE>,
  typeof CORES
>;
