import { Gas, ServiceIndex } from "../genericTypes.js";
/**
 * `χ`
 * $(0.6.4 - 9.9)
 */
export type PrivilegedServices = {
  /**
   * `m` - the index of the blessed service
   */
  manager: ServiceIndex;

  /**
   * `v`
   * service which can alter ι
   */
  designate: ServiceIndex;

  /**
   * `a`
   * service which can alter φ
   */
  assign: ServiceIndex;

  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `g`
   */
  alwaysAccumulate: Map<ServiceIndex, Gas>;
};
