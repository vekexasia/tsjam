import { MINIMUM_PUBLIC_SERVICE_INDEX } from "@tsjam/constants";
import { Delta, ServiceIndex } from "@tsjam/types";

/**
 * $(0.7.0 - B.14)
 */
export function check_fn_070(i: ServiceIndex, delta: Delta): ServiceIndex {
  if (delta.elements.has(i)) {
    return check_fn_070(
      (((i - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9)) + 2 ** 8) as ServiceIndex,
      delta,
    );
  } else {
    return i;
  }
}

export function check_fn_071(i: ServiceIndex, delta: Delta): ServiceIndex {
  if (delta.elements.has(i)) {
    return check_fn_071(
      <ServiceIndex>(
        (((i - MINIMUM_PUBLIC_SERVICE_INDEX + 1) %
          (2 ** 32 - 2 ** 8 - MINIMUM_PUBLIC_SERVICE_INDEX)) +
          MINIMUM_PUBLIC_SERVICE_INDEX)
      ),
      delta,
    );
  } else {
    return i;
  }
}

export const check_fn = check_fn_071;
