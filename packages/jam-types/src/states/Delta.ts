import { ServiceIndex } from "@/genericTypes";
import { ServiceAccount } from "@/sets/ServiceAccount";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.0 - 9.2)
 */
export type Delta = Map<ServiceIndex, ServiceAccount>;
