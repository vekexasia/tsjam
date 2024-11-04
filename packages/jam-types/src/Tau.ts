import { Tagged, u32 } from "@/genericTypes.js";

/**
 * `τ`
 * defines the most recent block's slot index
 * NOTE: τ' = Ht
 */
export type Tau = Tagged<u32, "tau">;
