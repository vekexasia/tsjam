// $(0.6.6 - 12.15)

import { Hash, ServiceIndex } from "@/genericTypes";

/*
 * `servouts` or `B`
 * also used for `θ` in $(0.6.7 - 7.4)
 */
export type ServiceOuts = Set<{
  serviceIndex: ServiceIndex;
  accumulationResult: Hash;
}>;
