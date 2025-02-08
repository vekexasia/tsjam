import { Gas, ServiceIndex } from "../genericTypes.js";
/**
 * `χ`
 * $(0.6.1 - 9.9)
 */
export type PrivilegedServices = {
  /**
   * `m`
   * Index of the service able to alter PrivilegedServices from block to block
   */
  bless: ServiceIndex;

  /**
   * `a`
   * service which can alter φ
   */
  assign: ServiceIndex;

  /**
   * `v`
   * service which can alter ι
   */
  designate: ServiceIndex;

  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `g`
   */
  alwaysAccumulate: Map<ServiceIndex, Gas>;
};
