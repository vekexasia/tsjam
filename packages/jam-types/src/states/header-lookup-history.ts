import { HeaderHash } from "@/generic-types";
import { Slot } from "@/slot";
/**
 * This is not really defined in graypaper
 * but used to compute $(0.7.1 - 11.34)
 */
export type HeaderLookupHistory = {
  elements: Map<Slot, HeaderHash>;
};
