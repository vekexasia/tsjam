import { ByteArrayOfLength, ServiceIndex, u64 } from "@/genericTypes.js";
import { TRANSFER_MEMO_SIZE } from "@vekexasia/jam-constants";

/**
 * `T` set in graypaper
 * (161)
 */
export type DeferredTransfer = {
  sender: ServiceIndex;
  destination: ServiceIndex;
  amount: u64;
  memo: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;
  gasLimit: u64;
};
