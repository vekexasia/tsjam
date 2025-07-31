import { Hash, ServiceIndex } from "@/genericTypes";

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
