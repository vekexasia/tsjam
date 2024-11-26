import { JamHeader } from "@/header.js";
import { Hash } from "@/genericTypes.js";
/**
 * This is not really defined in graypaper
 * but used to compute $(0.5.0 - 11.34)
 */
export type HeaderLookupHistory = Map<Hash, JamHeader>;
