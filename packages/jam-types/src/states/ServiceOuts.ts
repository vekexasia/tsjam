import { Hash, ServiceIndex } from "@/genericTypes";

/*
 * `servouts` or `B`
 * $(0.7.0 - 12.15)
 */
export type ServiceOuts = Set<{
  serviceIndex: ServiceIndex;
  accumulationResult: Hash;
}>;
