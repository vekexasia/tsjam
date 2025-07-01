import { fixedSizeIdentityCodec } from "@/identity";
import { E_sub, E_sub_int } from "@/ints/E_subscr.js";
import { createCodec } from "@/utils.js";
import { TRANSFER_MEMO_SIZE } from "@tsjam/constants";
import { Balance, DeferredTransfer, Gas, ServiceIndex } from "@tsjam/types";

/**
 * DeferredTransferCodec
 * NOTE: there is no formal specification in graypaper
 */
export const DeferredTransferCodec = createCodec<DeferredTransfer>([
  ["source", E_sub_int<ServiceIndex>(4)],
  ["destination", E_sub_int<ServiceIndex>(4)],
  ["amount", E_sub<Balance>(8)],
  ["memo", fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE)],
  ["gas", E_sub<Gas>(8)],
]);
