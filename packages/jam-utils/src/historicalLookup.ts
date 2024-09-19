import { Hash, ServiceAccount, UpToSeq, u32 } from "@vekexasia/jam-types";
import assert from "node:assert";
import { toTagged } from "@/utils.js";

/**
 * `Λ` in the graypaper
 * (93)
 */
export const historicalLookup = (
  a: ServiceAccount,
  timeslot: u32,
  hash: Hash,
): Uint8Array | undefined => {
  const ap = a.preimage_p.get(hash);
  if (
    typeof ap !== "undefined" &&
    IFn(a.preimage_l.get(hash)!.get(toTagged(ap.length as u32))!, timeslot)
  ) {
    return a.preimage_p.get(hash)!;
  }
};

const IFn = (l: UpToSeq<u32, 3, "Nt">, t: u32) => {
  switch (l.length) {
    case 0:
      return false;
    case 1:
      return l[0] <= t;
    case 2:
      return l[0] <= t && l[1] > t;
    case 3:
      return l[0] <= t && l[1] > t && l[2] <= t;
    default:
      assert(false, "should never happen");
  }
};
