import { JamHeader } from "@/header.js";
import { Hash } from "@/genericTypes.js";
import { Tau } from "@/Tau.js";
/**
 * This is not really defined in graypaper
 * but used to compute $(0.5.4 - 11.34)
 */
export type HeaderLookupHistory = Map<Tau, { header: JamHeader; hash: Hash }>;
