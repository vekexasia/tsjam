import { ServiceIndex, Gas, u32 } from "@/genericTypes";
/**
 * $(0.7.1 - 12.26) | S
 */
export type AccumulationStatistics = {
  elements: Map<ServiceIndex, { gasUsed: Gas; count: u32 }>;
};
