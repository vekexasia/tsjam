import {
  Dagger,
  Delta,
  ServiceIndex,
  newSTF,
  toTagged,
  u32,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { Hashing } from "@vekexasia/jam-crypto";

// (156) in graypaper
export const deltaToDagger = newSTF<
  Delta,
  {
    // We are not using the native type to avoid circular dependencies
    EP_Extrinsic: Array<{
      serviceIndex: ServiceIndex;
      preimage: Uint8Array;
    }>;
    // todo: tau needs better typing
    nextTau: u32;
  },
  Dagger<Delta>
>((input, curState) => {
  const result = new Map(curState) as Dagger<Delta>;
  for (const { serviceIndex, preimage } of input.EP_Extrinsic) {
    const x = result.get(serviceIndex);
    assert(typeof x !== "undefined", "service index not found");

    const hash = Hashing.blake2b(preimage);
    // clone to avoid modifying original Delta
    x!.preimage_p = new Map(x!.preimage_p);
    x!.preimage_p.set(hash, preimage);

    x!.preimage_l = new Map(x!.preimage_l);
    let plh = x!.preimage_l.get(hash);
    if (typeof plh === "undefined") {
      plh = new Map();
    } else {
      // clone
      plh = new Map(plh);
    }
    // set
    x!.preimage_l.set(hash, plh);
    // (156)
    plh.set(toTagged(preimage.length as u32), toTagged([input.nextTau]));
  }
  return result;
});

// TODO: implement tests
