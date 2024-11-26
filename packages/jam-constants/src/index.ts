export * from "./pvmResultContants.js";
/**
 * Jam Common Era, 1200 UTC on January 1, 2024.
 */
export const JAM_COMMON_ERA = 1704110400;
/**
 * referred as `P` in the paper
 * also known as slot period
 */
export const BLOCK_TIME = 6;
export const RECENT_HISTORY_LENGTH = 8;
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
 * `U` in the paper
 */
export const WORK_TIMEOUT = 5;
/**
 * referred as constant `R` in the paper
 */
export const VALIDATOR_CORE_ROTATION = 10;
/**
 * referred as capital i in the paper
 */
export const MAXIMUM_WORK_ITEMS = 4;

/**
 * `Wm` in the paper
 * 2^11
 */
export const MAX_WORKPACKAGE_ENTRIES = 2048;
/**
 * defined in timeslots
 * @see L in the paper
 *
 * it's essentially 1 day = 14400 * 6s = 86400s
 */
export const MAXIMUM_AGE_LOOKUP_ANCHOR = 14400;

/**
 * Denoted with `Xa` in the paper. It's value is `jam_available`
 * $(0.5.0 - 11.12)
 */
export const JAM_AVAILABLE = new TextEncoder().encode("jam_available");
/**
 * Denoted with `XB` in the paper. It's value is `jam_beefy`
 */
export const JAM_BEEFY = new TextEncoder().encode("jam_beefy");
/**
 * Denoted with `XE` in the paper. It's value is `jam_entropy`
 * $(0.5.0 - 6.18)
 */
export const JAM_ENTROPY = new TextEncoder().encode("jam_entropy");
/**
 * Denoted with `XE` in the paper. It's value is `jam_fallback_seal`
 * $(0.5.0 - 6.19)
 */
export const JAM_FALLBACK_SEAL = new TextEncoder().encode("jam_fallback_seal");
/**
 * Denoted with `XG` in the paper. It's value is `jam_guarantee`
 * $(0.5.0 - 11.26)
 */
export const JAM_GUARANTEE = new TextEncoder().encode("jam_guarantee");
/**
 * Denoted with `XI` in the paper. It's value is `jam_announce`
 */
export const JAM_ANNOUNCE = new TextEncoder().encode("jam_announce");
/**
 * Denoted with `XT` in the paper. It's value is `jam_ticket_seal`
 * $(0.5.0 - 6.20)
 */
export const JAM_TICKET_SEAL = new TextEncoder().encode("jam_ticket_seal");
/**
 * Denoted with `XU` in the paper. It's value is `jam_audit`
 */
export const JAM_AUDIT = new TextEncoder().encode("jam_audit");
/**
 * Denoted with `Xtrue` in the paper. It's value is `jam_valid`
 * $(0.5.0 - 10.4)
 */
export const JAM_VALID = new TextEncoder().encode("jam_valid");
/**
 * Denoted with `Xfalse` in the paper. It's value is `jam_invalid`
 * $(0.5.0 - 10.4)
 */
export const JAM_INVALID = new TextEncoder().encode("jam_invalid");

/**
 * `GA` in the paper
 * TODO: set to correct value
 */
export const MAX_GAS_ACCUMULATION = 1000000000n;

/**
 * `O` in the paper
 */
export const AUTHPOOL_SIZE = 8;

/**
 * `Q` in the paper
 */
export const AUTHQUEUE_MAX_SIZE = 80;

/**
 * `S` in the paper
 */
export const SERVICECODE_MAX_SIZE = 40000000;
/**
 * `BS` in the paper
 */
export const SERVICE_MIN_BALANCE = 100n;
/**
 * `BL` in the paper
 */
export const SERVICE_ADDITIONAL_BALANCE_PER_OCTET = 1n;
/**
 * `BI` in the paper
 */
export const SERVICE_ADDITIONAL_BALANCE_PER_ITEM = 10n;
/**
 * `M` in the paper
 */
export const TRANSFER_MEMO_SIZE = 128;

/**
 * `D` in the paper
 */
export const PREIMAGE_EXPIRATION = 28800;

/**
 * `Wc` in the paper
 */
export const ERASURECODE_BASIC_SIZE = 684;

/**
 * `Ws` in the paper
 */
export const ERASURECODE_EXPORTED_SIZE = 6;

/**
 * `GA`
 */
export const TOTAL_GAS_ACCUMULATION_PER_CORE = 100000n;

/**
 * `GI`
 */
export const TOTAL_GAS_IS_AUTHORIZED = 1000000n;

/**
 * `GR`
 */
export const TOTAL_GAS_REFINE = 500000000n;

/**
 * `GT`
 */
export const TOTAL_GAS_ACCUMULATION_ALL_CORES = 341000000n;
