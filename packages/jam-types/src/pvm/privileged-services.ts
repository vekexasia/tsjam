import { CORES } from "@tsjam/constants";
import { Gas, SeqOfLength, ServiceIndex } from "../generic-types";
/**
 * `χ`
 * $(0.7.1 - 9.9 / 9.10 / 9.11)
 */
export type PrivilegedServices = {
  /**
   * `M` - the index of the blessed service
   */
  manager: ServiceIndex;

  /**
   * `A`
   * services which can alter φ one for each CORE
   */
  assigners: SeqOfLength<ServiceIndex, typeof CORES>;

  /**
   * `v`
   * service which can alter ι
   */
  delegator: ServiceIndex;

  /**
   * `R`
   */
  registrar: ServiceIndex;

  /**
   * map of services which are automatically accumulated in each block
   * along with their gas limits
   * `Z`
   */
  alwaysAccers: Map<ServiceIndex, Gas>;
};
