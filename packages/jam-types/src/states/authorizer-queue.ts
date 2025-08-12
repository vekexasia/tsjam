import { AuthorizerHash, SeqOfLength } from "@/generic-types";
import { AUTHQUEUE_MAX_SIZE, CORES } from "@tsjam/constants";

/**
 * `ϕ`
 * $(0.7.1 - 8.1)
 * A queue of AuthorizerHash-es, each of which will be rotated in the AuthorizerPool
 */
export type AuthorizerQueue = {
  elements: SeqOfLength<
    SeqOfLength<AuthorizerHash, typeof AUTHQUEUE_MAX_SIZE /* 80 */>,
    typeof CORES
  >;
};
