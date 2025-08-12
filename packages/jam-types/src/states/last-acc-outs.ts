import { Hash, ServiceIndex } from "@/generic-types";

/**
 * `θ` - `\lastaccout`
 * $(0.7.1 - 7.4)
 */
export type LastAccOuts = {
  elements: Array<{
    serviceIndex: ServiceIndex;
    accumulationResult: Hash;
  }>;
};
