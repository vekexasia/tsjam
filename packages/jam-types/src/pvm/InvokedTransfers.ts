import { Gas, ServiceIndex } from "@/genericTypes";
import { ServiceAccount } from "@/sets/ServiceAccount";
export type InvokedTransferResult = {
  account: ServiceAccount;
  /**
   * `u`
   */
  gasUsed: Gas;
};

export type InvokedTransfers = {
  elements: Map<ServiceIndex, InvokedTransferResult>;
};
