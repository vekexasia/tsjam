/**
 * Jam Common Era, 1200 UTC on January 1, 2024.
 */
export const JAM_COMMON_ERA = 1704110400;
/**
 * referred as constant `V` in the paper
 */
export const NUMBER_OF_VALIDATORS = 1023;
export const MINIMUM_VALIDATORS = 683;
export const CORES = 381;
/**
 * referred as constant `Y` in the paper
 */
export const LOTTERY_MAX_SLOT = 500;
/**
 * referred as constant `E` in the paper
 */
export const EPOCH_LENGTH = 600;
/**
 * referred as constant `K` in the paper
 */
export const MAX_TICKETS_PER_BLOCK = 16;
/**
 * referred as capital i in the paper
 */
export const MAXIMUM_WORK_ITEMS = 4;
/**
 * defined in timeslots
 * @see L in the paper
 *
 * it's essentially 1 day => 14400 * 6s = 86400s
 */
export const MAXIMUM_AGE_LOOKUP_ANCHOR = 14400;

/**
 * Denoted with `Xa` in the paper. It's value is `jam_available`
 */
export const JAM_AVAILABLE = new TextEncoder().encode("jam_available");
/**
 * Denoted with `XB` in the paper. It's value is `jam_beefy`
 */
export const JAM_BEEFY = new TextEncoder().encode("jam_beefy");
/**
 * Denoted with `XE` in the paper. It's value is `jam_entropy`
 */
export const JAM_ENTROPY = new TextEncoder().encode("jam_entropy");
/**
 * Denoted with `XE` in the paper. It's value is `jam_fallback_seal`
 */
export const JAM_FALLBACK_SEAL = new TextEncoder().encode("jam_fallback_seal");
/**
 * Denoted with `XG` in the paper. It's value is `jam_guarantee`
 */
export const JAM_GUARANTEE = new TextEncoder().encode("jam_guarantee");
/**
 * Denoted with `XI` in the paper. It's value is `jam_announce`
 */
export const JAM_ANNOUNCE = new TextEncoder().encode("jam_announce");
/**
 * Denoted with `XT` in the paper. It's value is `jam_ticket_seal`
 */
export const JAM_TICKET_SEAL = new TextEncoder().encode("jam_ticket_seal");
/**
 * Denoted with `XU` in the paper. It's value is `jam_audit`
 */
export const JAM_AUDIT = new TextEncoder().encode("jam_audit");
/**
 * Denoted with `Xtrue` in the paper. It's value is `jam_valid`
 */
export const JAM_VALID = new TextEncoder().encode("jam_valid");
/**
 * Denoted with `Xfalse` in the paper. It's value is `jam_invalid`
 */
export const JAM_INVALID = new TextEncoder().encode("jam_invalid");
