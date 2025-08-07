import { JamHeader } from "@/header.js";
import { Slot } from "@/Slot.js";
/**
 * This is not really defined in graypaper
 * but used to compute $(0.7.1 - 11.34)
 */
export type HeaderLookupHistory = {
  elements: Map<Slot, JamHeader>;
};
