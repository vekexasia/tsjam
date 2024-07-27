import { Hash, Tagged } from "@/genericTypes.js";

export type AuthorizerHash = Tagged<Hash, "authorizer-hash">;
// refered as α (alpha) in the paper.
// it gets populated by the authorizer queue below.
// for each block:
// - if there is a workreport is being submitted, then the pool new value would be (pool - workreport) + AuthorizerQueue[coreIndex][Ht] modulo 80
// - if there is no workreport, then the pool new value would be (pool + AuthorizerQueue[coreIndex][Ht]) modulo 80
// after this operation, we take the resulting array and keep the last 8 elements
// we need to remove the leftmost authorizer from the pool that matches the workreport submitted
export type AuthorizerPool = Tagged<
  Array<Tagged<AuthorizerHash[], "authorizers", { maxLength: 8 /* O=8 */ }>>,
  "authorizer-pool",
  { length: 381 } // one for each core
>;
/* the authorizer queue basically sets which authorizers are going to be useable within the next 80 blocks (kindof)
 * if nothing is provided, then the authorizerqueue is expected to be the same as the last one
 */
export type AuthorizerQueue = Tagged<
  Array<Tagged<AuthorizerHash[], "authorizers", { length: 80 /* Q=80 */ }>>,
  "atuhorizer-queue",
  { length: 381 } // one for each core
>;
