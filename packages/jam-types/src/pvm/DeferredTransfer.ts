import { ByteArrayOfLength, ServiceIndex, u64 } from "@/genericTypes.js";
import { TRANSFER_MEMO_SIZE } from "@tsjam/constants";

/**
 * `T` set in graypaper
 * $(0.5.0 - 12.14)
 */
export type DeferredTransfer = {
  sender: ServiceIndex;
  destination: ServiceIndex;
  /**
   * `a`
   */
  amount: u64;
  memo: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;
  gasLimit: u64;
};
