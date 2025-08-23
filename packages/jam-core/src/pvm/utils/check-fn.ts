import { DeltaImpl } from "@/impls/delta-impl";
import { ServiceIndex } from "@tsjam/types";

/**
 * $(0.7.0 - B.14)
 */
export function check_fn(i: ServiceIndex, delta: DeltaImpl): ServiceIndex {
  if (delta.has(i)) {
    return check_fn(
      (((i - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9)) + 2 ** 8) as ServiceIndex,
      delta,
    );
  } else {
    return i;
  }
}
