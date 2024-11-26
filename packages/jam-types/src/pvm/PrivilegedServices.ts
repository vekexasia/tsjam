import { Gas, ServiceIndex } from "@/genericTypes.js";

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
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   */
  g: Map<ServiceIndex, Gas>;
};
