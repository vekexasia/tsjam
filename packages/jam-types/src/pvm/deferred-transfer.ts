import {
  Balance,
  ByteArrayOfLength,
  Gas,
  ServiceIndex,
} from "@/generic-types";
import { TRANSFER_MEMO_SIZE } from "@tsjam/constants";

/**
 * `X` set in graypaper
 * $(0.7.1 - 12.14)
 */
export type DeferredTransfer = {
  /**
   * `s`
   */
  source: ServiceIndex;

  /**
   * `d`
   */
  destination: ServiceIndex;

  /**
   * `a`
   */
  amount: Balance;

  /**
   * `m`
   */
  memo: ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>;

  /**
   * `g`
   */
  gas: Gas;
};

export type DeferredTransfers = {
  elements: Array<DeferredTransfer>;
};
