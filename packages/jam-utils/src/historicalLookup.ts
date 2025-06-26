import { Hash, ServiceAccount, Tau, UpToSeq, u32 } from "@tsjam/types";
import assert from "node:assert";
import { toTagged } from "@/utils.js";

/**
 * `Λ` in the graypaper
 * $(0.6.4 - 9.7)
 * @param a - the service account
 * @param tau - the timeslot for the lookup
 * @param hash - the hash to look up
 */
export const historicalLookup = (
  a: ServiceAccount,
  tau: Tau,
  hash: Hash,
): Uint8Array | undefined => {
  // TODO: 9.5 states that tau is no more than `D` timeslots old. but there is no way here to enforce that nor behavior is specified if the parameter is out of bounds
  const ap = a.preimages.get(hash);
  if (
    typeof ap !== "undefined" &&
    I_Fn(a.requests.get(hash)!.get(toTagged(ap.length as u32))!, tau)
  ) {
    return a.preimages.get(hash)!;
  }
};

/**
 * Checks based on the length of the preimage and tau if it is valid
 */
const I_Fn = (l: UpToSeq<Tau, 3>, t: Tau) => {
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
