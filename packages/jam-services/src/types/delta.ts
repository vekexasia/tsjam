import { ServiceIndex } from "@vekexasia/jam-types";
import { ServiceAccount } from "@/types/serviceAccount.js";

/**
 * It's identified as δ or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * (88) in the graypaper
 */
export type Delta = Map<ServiceIndex, ServiceAccount>;
