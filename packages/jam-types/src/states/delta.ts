import { ServiceIndex } from "@/generic-types";
import { ServiceAccount } from "@/sets/service-account";

/**
 * `δ` or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * $(0.7.1 - 9.2)
 */
export type Delta = {
  elements: Map<ServiceIndex, ServiceAccount>;
};
