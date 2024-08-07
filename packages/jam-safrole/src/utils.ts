import { SafroleState } from "@/index.js";
import {
  BandersnatchKey,
  BandersnatchSignature,
  EPOCH_LENGTH,
  OpaqueHash,
  SeqOfLength,
  TicketIdentifier,
} from "@vekexasia/jam-types";

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

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("isFallbackMode", () => {
    it("should return true if gamma_s is a series of E Bandersnatch keys", () => {
      const gamma_s = [
        1n as BandersnatchKey,
        2n as BandersnatchKey,
      ] as SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">;
      expect(isFallbackMode(gamma_s)).toBe(true);
    });
    it("should return false if gamma_s is a series of E tickets", () => {
      const gamma_s = [
        { id: 32n as OpaqueHash, attempt: 0 },
        { id: 32n as OpaqueHash, attempt: 1 },
      ] as SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">;
      expect(isFallbackMode(gamma_s)).toBe(false);
    });
  });
}
