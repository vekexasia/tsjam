import { Dagger, Delta, ServiceIndex } from "@vekexasia/jam-types";

/**
 * (260)
 */
export function check_fn(
  i: ServiceIndex,
  dd_delta: Dagger<Delta>,
): ServiceIndex {
  if (dd_delta.has(i)) {
    return check_fn(
      (((i - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9)) + 2 ** 8) as ServiceIndex,
      dd_delta,
    );
  } else {
    return i;
  }
}
