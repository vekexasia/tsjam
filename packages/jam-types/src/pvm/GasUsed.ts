import { ServiceIndex, Gas } from "@/genericTypes";

/*
 * `gasused` gas used by each service
 * also known as `U`
 * $(0.7.0 - 12.15)
 */
export type GasUsed = {
  elements: Array<{
    // `s`
    serviceIndex: ServiceIndex;
    // `u`
    gasUsed: Gas;
  }>;
};
