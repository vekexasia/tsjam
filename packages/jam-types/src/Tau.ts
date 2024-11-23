import { Tagged, u32 } from "@/genericTypes.js";

/**
 * `τ`
 * defines the most recent block's slot index
 * NOTE: τ' = Ht
 * $(0.5.0 - 4.28)
 */
export type Tau = Tagged<u32, "tau">;
