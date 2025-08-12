import { DeltaImpl } from "@/classes/delta-impl";
import { MINIMUM_PUBLIC_SERVICE_INDEX } from "@tsjam/constants";
import { ServiceIndex } from "@tsjam/types";

/**
 * $(0.7.1 - B.14)
 */
export function check_fn(i: ServiceIndex, delta: DeltaImpl): ServiceIndex {
  if (delta.has(i)) {
    return check_fn(
      (((i - MINIMUM_PUBLIC_SERVICE_INDEX + 1) %
        (2 ** 32 - 2 ** 8 - MINIMUM_PUBLIC_SERVICE_INDEX)) +
        MINIMUM_PUBLIC_SERVICE_INDEX) as ServiceIndex,
      delta,
    );
  } else {
    return i;
  }
}
