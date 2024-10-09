import { Delta, ServiceIndex } from "@tsjam/types";

/**
 * (260)
 */
export function check_fn(i: ServiceIndex, delta: Delta): ServiceIndex {
  if (delta.has(i)) {
    return check_fn(
      (((i - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9)) + 2 ** 8) as ServiceIndex,
      delta,
    );
  } else {
    return i;
  }
}
