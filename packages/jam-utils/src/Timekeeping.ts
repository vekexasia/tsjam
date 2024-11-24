import { EPOCH_LENGTH, JAM_COMMON_ERA } from "@tsjam/constants";
import { Posterior, Tau } from "@tsjam/types";

export class Timekeeping {
  static getJamSlotSinceEpoch() {
    return (this.bigT() / 6) | 0;
  }

  static getJamEpoch() {
    return (this.getJamSlotSinceEpoch() / 36) | 0;
  }

  static getJamSlotSinceEpochFromNow() {
    return this.getJamSlotSinceEpoch() % 36;
  }

  /**
   * `T` in the graypaper
   * see section 4.4 - Time
   */
  static bigT() {
    const now = (Date.now() / 1000) | 0;
    return now - JAM_COMMON_ERA;
  }
}
/**
 * `m` in the graypaper
 * @param timeSlot - the time slot or `Ht` in the graypaper
 * @see section 6.1 - Timekeeping
 */
export const slotIndex = (timeSlot: Tau) => timeSlot % EPOCH_LENGTH;

/**
 * `r` in the graypaper
 * @param timeSlot - the time slot or `Ht` in the graypaper
 * @see section 6.1 - Timekeeping
 */
export const epochIndex = (timeSlot: number) =>
  Math.floor(timeSlot / EPOCH_LENGTH);

/**
 * check if the header is the first block of a new era
 * Note: this returns true even in the case of a skipped era
 */
export const isNewEra = (newSlotIndex: number, curSlotIndex: number) => {
  return epochIndex(newSlotIndex) > epochIndex(curSlotIndex);
};

export const isSameEra = (newSlotIndex: number, curSlotIndex: number) => {
  return epochIndex(newSlotIndex) === epochIndex(curSlotIndex);
};

/**
 * check if the header is the first block of a new **next** era
 * Similar to {@link isNewEra} but checks if the new era is the next era
 * @see isNewEra
 */
export const isNewNextEra = (
  newSlotIndex: Posterior<Tau>,
  curSlotIndex: Tau,
) => {
  return epochIndex(newSlotIndex) === epochIndex(curSlotIndex) + 1;
};
