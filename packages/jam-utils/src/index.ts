import {
  BandersnatchKey,
  SafroleState,
  SeqOfLength,
} from "@vekexasia/jam-types";
import { EPOCH_LENGTH } from "@vekexasia/jam-constants";

export * from "./bigint_bytes.js";
export * from "./hex.js";
export * from "./Timekeeping.js";
export * from "./utils.js";
export * from "./STF.js";
export * from "./serviceAccountThreshold.js";

/**
 * Check if the current epoch is in fallback mode.
 * @param gamma_s - a series of E tickets or, in the case of a fallback mode, a series of E Bandersnatch keys
 * @returns
 * @see SafroleState.gamma_s
 */
export const isFallbackMode = (
  gamma_s: SafroleState["gamma_s"],
): gamma_s is SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s"> => {
  return typeof gamma_s[0] === "bigint";
};
