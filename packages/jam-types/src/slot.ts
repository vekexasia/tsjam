import { Tagged, u32 } from "@/generic-types";

/**
 * defineds the slot (often coming from Tau)
 */
export type Slot = { value: u32 };

/**
 * `τ`
 */
export type Tau = Tagged<Slot, "tau">;
