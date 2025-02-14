import { AuthorizerHash, SeqOfLength } from "@/genericTypes.js";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";
import { type AuthorizerPool } from "./AuthorizerPool";

/**
 * `φ`
 * $(0.6.1 - 8.1)
 * A queue of {@link AuthorizerHash}-es, each of which will be rotated in the {@link AuthorizerPool}
 */
export type AuthorizerQueue = SeqOfLength<
  SeqOfLength<AuthorizerHash, typeof AUTHQUEUE_MAX_SIZE /* 80 */>,
  typeof CORES /* 341 */
>;
