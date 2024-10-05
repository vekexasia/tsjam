import { ServiceIndex, u64 } from "@/genericTypes.js";

export type PrivilegedServices = {
  /**
   * `m`
   */
  m: ServiceIndex;
  /**
   * `a`
   */
  a: ServiceIndex;
  /**
   * `v`
   */
  v: ServiceIndex;
  /**
   * gas limits
   */
  g: Map<ServiceIndex, u64>;
};
