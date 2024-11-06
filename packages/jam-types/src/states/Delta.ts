import { ServiceIndex } from "@/genericTypes";
import { ServiceAccount } from "@/sets/ServiceAccount";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * (89) - 0.4.5
 */
export type Delta = Map<ServiceIndex, ServiceAccount>;
