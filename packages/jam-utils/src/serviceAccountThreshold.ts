import {
  SERVICE_ADDITIONAL_BALANCE_PER_ITEM,
  SERVICE_ADDITIONAL_BALANCE_PER_OCTET,
  SERVICE_MIN_BALANCE,
} from "@vekexasia/jam-constants";
import { ServiceAccount, u64 } from "@vekexasia/jam-types";

/**
 * compute the gas threshold of a service account
 * @param a - the service account
 * @see (94) in the graypaper
 */
export const computeServiceAccountThreshold = (a: ServiceAccount): u64 => {
  const i = 2n * BigInt(a.preimage_l.size) + BigInt(a.storage.size);
  const l =
    [...a.preimage_l.values()].reduce(
      (acc, v) => acc + [...v.keys()].reduce((a, b) => a + BigInt(b) + 81n, 0n),
      0n,
    ) +
    [...a.storage.values()].reduce((a, b) => a + BigInt(b.length) + 32n, 0n);
  return (SERVICE_MIN_BALANCE +
    SERVICE_ADDITIONAL_BALANCE_PER_ITEM * i +
    SERVICE_ADDITIONAL_BALANCE_PER_OCTET * l) as u64;
};
