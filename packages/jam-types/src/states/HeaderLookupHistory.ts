import { JamHeader } from "@/header.js";
import { Tau } from "@/Tau.js";
/**
 * This is not really defined in graypaper
 * but used to compute $(0.7.1 - 11.34)
 */
export type HeaderLookupHistory = {
  elements: Map<Tau, JamHeader>;
};
