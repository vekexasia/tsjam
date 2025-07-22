import { Gas, ServiceIndex } from "@/genericTypes";
import { ServiceAccount } from "@/sets/ServiceAccount";

export type InvokedTransfers = {
  elements: Map<
    ServiceIndex,
    {
      account: ServiceAccount;
      gasUsed: Gas;
    }
  >;
};
