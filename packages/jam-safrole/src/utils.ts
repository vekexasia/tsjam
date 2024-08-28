import { IDisputesState, SafroleState } from "@/index.js";
import {
  BandersnatchKey,
  EPOCH_LENGTH,
  JamHeader,
  OpaqueHash,
  Posterior,
  SeqOfLength,
  TicketIdentifier,
  ValidatorData,
} from "@vekexasia/jam-types";

/**
 * `m` in the graypaper
 * @param timeSlot - the time slot or `Ht` in the graypaper
 * @see section 6.1 - Timekeeping
 */
export const slotIndex = (timeSlot: number) => timeSlot % EPOCH_LENGTH;

/**
 * `r` in the graypaper
 * @param timeSlot - the time slot or `Ht` in the graypaper
 * @see section 6.1 - Timekeeping
 */
export const epochIndex = (timeSlot: number) =>
  Math.floor(timeSlot / EPOCH_LENGTH);

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
/**
 * `Ha` in the graypaper
 * @param header - the header of the blockj
 * @param state - the state of the safrole state machine
 */
export const getBlockAuthorKey = (header: JamHeader, state: SafroleState) => {
  if (isFallbackMode(state.gamma_s)) {
    return state.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
  } else {
    //return state.gamma_s[header.timeSlotIndex % EPOCH_LENGTH].id;
    // TODO: implment how to get key - see (43) in the graypaper
    const k = state.kappa[header.blockAuthorKeyIndex];
    return k.banderSnatch;
  }
};

/**
 * check if the header is the first block of a new era
 * Note: this returns true even in the case of a skipped era
 */
export const isNewEra = (newSlotIndex: number, curSlotIndex: number) => {
  return epochIndex(newSlotIndex) > epochIndex(curSlotIndex);
};

/**
 * check if the header is the first block of a new **next** era
 * Similar to {@link isNewEra} but checks if the new era is the next era
 * @see isNewEra
 */
export const isNewNextEra = (newSlotIndex: number, curSlotIndex: number) => {
  return epochIndex(newSlotIndex) === epochIndex(curSlotIndex) + 1;
};

export const PHI_FN = <T extends ValidatorData[]>(
  validatorKeys: ValidatorData[],
  p_psi_o: Posterior<IDisputesState["psi_o"]>,
): T => {
  return validatorKeys.map((v) => {
    if (p_psi_o.has(v.ed25519)) {
      return {
        banderSnatch: 0n as BandersnatchKey,
        ed25519: 0n as ValidatorData["ed25519"],
        blsKey: new Uint8Array(144) as ValidatorData["blsKey"],
        metadata: new Uint8Array(128) as ValidatorData["metadata"],
      };
    }
    return v;
  }) as T;
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
