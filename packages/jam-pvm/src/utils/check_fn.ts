import { Delta, ServiceIndex } from "@tsjam/types";

/**
 * $(0.5.3 - B.13)
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
