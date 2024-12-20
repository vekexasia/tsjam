import { fixedSizeIdentityCodec } from "@/identity";
import { createCodec } from "@/utils.js";
import { E_sub, E_sub_int } from "@/ints/E_subscr.js";
import { TRANSFER_MEMO_SIZE } from "@tsjam/constants";
import { DeferredTransfer, u64, ServiceIndex, Gas } from "@tsjam/types";

/**
 * DeferredTransferCodec
 * NOTE: there is no formal specification in graypaper
 */
export const DeferredTransferCodec = createCodec<DeferredTransfer>([
  ["sender", E_sub_int<ServiceIndex>(4)],
  ["destination", E_sub_int<ServiceIndex>(4)],
  ["amount", E_sub<u64>(8)],
  ["memo", fixedSizeIdentityCodec(TRANSFER_MEMO_SIZE)],
  ["gasLimit", E_sub<Gas>(8)],
]);
