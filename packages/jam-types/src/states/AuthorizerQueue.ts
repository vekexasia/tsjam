import { Hash, SeqOfLength } from "@/genericTypes.js";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";

// [ [H]Q ]C
/**
 * `φ` (84)
 * the authorizer queue basically sets which authorizers are going to be useable within the next 80 blocks (kindof)
 * if nothing is provided, then the authorizerqueue is expected to be the same as the last one
 *
 */
export type AuthorizerQueue = SeqOfLength<
  SeqOfLength<Hash, typeof AUTHQUEUE_MAX_SIZE>,
  typeof CORES
>;
