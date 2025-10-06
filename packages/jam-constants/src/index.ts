export * from "./pvmResultContants.js";
/**
 * Jam Common Era, 1200 UTC on January 1, 2024.
 */
export const JAM_COMMON_ERA = 1704110400;
/**
 * referred as `P` in the paper
 * also known as slot period
 */
export let BLOCK_TIME = 6;
/**
 * `H`
 */
export const RECENT_HISTORY_LENGTH = 8;
/**
 * `V` in the paper
 */
// These values can be switched at runtime via `initConstants`.
// They are initialized to the "full" variant by default.
export let NUMBER_OF_VALIDATORS = 1023 as const;
export let MINIMUM_VALIDATORS = 683 as const;
export let CORES = 341 as const;

/**
 * referred as constant `Y` in the paper
 */
export let LOTTERY_MAX_SLOT = 500;

/**
 * referred as constant `E` in the paper
 */
export let EPOCH_LENGTH = 600 as const;

/**
 * referred as constant `K` in the paper
 */
export let MAX_TICKETS_PER_BLOCK = 16 as const;

/**
 * `N` in the graypaper
 */
export let MAX_TICKETS_PER_VALIDATOR = 2 as const;

/**
 * `U` in the paper
 */
export const WORK_TIMEOUT = 5;

/**
 * `R` in the paper
 */
export let VALIDATOR_CORE_ROTATION = 10;

/**
 * `I` | the maximum amount of work items in a package.
 */
export const MAXIMUM_WORK_ITEMS = 16;

/**
 * `T` | the maximum number of extrinsics in a work-package
 */
export const MAXIMUM_EXTRINSICS_IN_WP = 128;

/**
 * `Wm` in the paper
 * 2^11
 */
export const MAX_WORKPACKAGE_ENTRIES = 3072;

/**
 * `Wr` in the paper
 * $(0.7.1 - 11.9)
 */
export const MAX_WORKREPORT_OUTPUT_SIZE = 48 * 2 ** 10;

/**
 * `J` in the paper
 */
export const MAX_WORK_PREREQUISITES = 8;
/**
 * `L` in the paper
 *
 * it's essentially 1 day = 14400 * 6s = 86400s
 */
export let MAXIMUM_AGE_LOOKUP_ANCHOR = 14400;

/**
 * `Wa` in the paper
 */
export const MAXIMUM_SIZE_IS_AUTHORIZED = 64_000;

/**
 * Denoted with `Xa` in the paper. It's value is `jam_available`
 * $(0.7.1 - 11.14)
 */
export const JAM_AVAILABLE = Buffer.from(
  new TextEncoder().encode("jam_available"),
);
/**
 * Denoted with `XB` in the paper. It's value is `jam_beefy`
 */
export const JAM_BEEFY = Buffer.from(new TextEncoder().encode("jam_beefy"));
/**
 * Denoted with `XE` in the paper. It's value is `jam_entropy`
 * $(0.7.1 - 6.18)
 */
export const JAM_ENTROPY = Buffer.from(new TextEncoder().encode("jam_entropy"));
/**
 * Denoted with `XE` in the paper. It's value is `jam_fallback_seal`
 * $(0.7.1 - 6.19)
 */
export const JAM_FALLBACK_SEAL = Buffer.from(
  new TextEncoder().encode("jam_fallback_seal"),
);
/**
 * Denoted with `XG` in the paper. It's value is `jam_guarantee`
 * $(0.7.1 - 11.27)
 */
export const JAM_GUARANTEE = Buffer.from(
  new TextEncoder().encode("jam_guarantee"),
);
/**
 * Denoted with `XI` in the paper. It's value is `jam_announce`
 */
export const JAM_ANNOUNCE = Buffer.from(
  new TextEncoder().encode("jam_announce"),
);
/**
 * Denoted with `XT` in the paper. It's value is `jam_ticket_seal`
 * $(0.7.1 - 6.20)
 */
export const JAM_TICKET_SEAL = Buffer.from(
  new TextEncoder().encode("jam_ticket_seal"),
);
/**
 * Denoted with `XU` in the paper. It's value is `jam_audit`
 */
export const JAM_AUDIT = Buffer.from(new TextEncoder().encode("jam_audit"));
/**
 * Denoted with `Xtrue` in the paper. It's value is `jam_valid`
 * $(0.7.1 - 10.4)
 */
export const JAM_VALID = Buffer.from(new TextEncoder().encode("jam_valid"));
/**
 * Denoted with `Xfalse` in the paper. It's value is `jam_invalid`
 * $(0.7.1 - 10.4)
 */
export const JAM_INVALID = Buffer.from(new TextEncoder().encode("jam_invalid"));

/**
 * `GA` in the paper
 */
export const MAX_GAS_ACCUMULATION = 10_000_000n;

/**
 * `GI` in the paper
 */
export const MAX_GAS_IS_AUTHORIZED = 50_000_000n;

/**
 * `O` in the paper
 */
export const AUTHPOOL_SIZE = 8;

/**
 * `Q` in the paper
 */
export const AUTHQUEUE_MAX_SIZE = 80;

/**
 * `WB`
 */
export const MAX_SIZE_ENCODED_PACKAGE = 13_794_305;

/**
 * `WC` in the paper
 */
export const SERVICECODE_MAX_SIZE = 4_000_000;

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
 * `WT` in the paper
 */
export const TRANSFER_MEMO_SIZE = 128;

/**
 * `D` in the paper
 * $(0.7.1 - B.3)
 */
export let PREIMAGE_EXPIRATION = 19_200;

/**
 * `WE` in the paper
 */
export let ERASURECODE_BASIC_SIZE = 684;

/**
 * `WP` in the paper
 */
export let ERASURECODE_EXPORTED_SIZE = 6;

/**
 * `WG` in the paper
 */
export const ERASURECODE_SEGMENT_SIZE = <4104>(
  (ERASURECODE_BASIC_SIZE * ERASURECODE_EXPORTED_SIZE)
);

/**
 * `WR` in the paper
 */
export const MAX_TOT_SIZE_BLOBS_WORKREPORT = 48 * 2 ** 10;

/**
 * `WX` in the paper
 */
export const MAX_EXPORTED_ITEMS = 3072;

/**
 * `WM` in the paper
 */
export const MAX_IMPORTED_ITEMS = 3072;

/**
 * `GA`
 */
export const TOTAL_GAS_ACCUMULATION_LOGIC = 10_000_000n;

/**
 * `GR`
 */
export let TOTAL_GAS_REFINEMENT_LOGIC = 5_000_000_000n;

/**
 * `GI`
 */
export const TOTAL_GAS_IS_AUTHORIZED = 50_000_000n;

/**
 * `GT`
 */
export let TOTAL_GAS_ACCUMULATION_ALL_CORES = 3_500_000_000n;
// $(0.7.1 - 4.25)
export const Zp = 2 ** 12;

/**
 * `S`
 */
export const MINIMUM_PUBLIC_SERVICE_INDEX = 2 ** 16;

// `R` in jam-np
export let RECOVERY_THRESHOLD = 683;

/**
 * Runtime initialization helpers
 *
 * Call `initConstants()` early in your application bootstrap (before importing modules
 * that rely on these variant-controlled values). If no `mode` is provided, the
 * function reads `process.env.JAM_CONSTANTS` and falls back to `'full'`.
 */
let CURRENT_MODE: "full" | "tiny" = "full";

// Synchronous initialization: import both variants statically and pick one
import * as _tiny from "./variants/tiny";

export function initConstants(mode?: "full" | "tiny") {
  const m = mode ?? (process.env.JAM_CONSTANTS === "tiny" ? "tiny" : "full");
  if (m === "full") return;
  const v = _tiny;

  NUMBER_OF_VALIDATORS = <1023>v.NUMBER_OF_VALIDATORS;
  CORES = <341>v.CORES;
  PREIMAGE_EXPIRATION = <19_200>v.PREIMAGE_EXPIRATION;
  BLOCK_TIME = <6>v.BLOCK_TIME;
  EPOCH_LENGTH = <600>v.EPOCH_LENGTH;
  LOTTERY_MAX_SLOT = <500>v.LOTTERY_MAX_SLOT;
  MAX_TICKETS_PER_VALIDATOR = <2>v.MAX_TICKETS_PER_VALIDATOR;
  MAX_TICKETS_PER_BLOCK = <16>v.MAX_TICKETS_PER_BLOCK;
  VALIDATOR_CORE_ROTATION = <10>v.VALIDATOR_CORE_ROTATION;
  ERASURECODE_EXPORTED_SIZE = <6>v.ERASURECODE_EXPORTED_SIZE;
  TOTAL_GAS_ACCUMULATION_ALL_CORES = <3_500_000_000n>(
    v.TOTAL_GAS_ACCUMULATION_ALL_CORES
  );
  TOTAL_GAS_REFINEMENT_LOGIC = <5_000_000_000n>v.TOTAL_GAS_REFINEMENT_LOGIC;
  MINIMUM_VALIDATORS = <683>v.MINIMUM_VALIDATORS;
  ERASURECODE_BASIC_SIZE = <684>v.ERASURECODE_BASIC_SIZE;
  CURRENT_MODE = m;
  RECOVERY_THRESHOLD = <683>v.RECOVERY_THRESHOLD;
  MAXIMUM_AGE_LOOKUP_ANCHOR = <14400>v.MAXIMUM_AGE_LOOKUP_ANCHOR;
}

export function getConstantsMode() {
  return CURRENT_MODE;
}

// initialize once synchronously from ENV at module load (fallback to 'full')
initConstants();
