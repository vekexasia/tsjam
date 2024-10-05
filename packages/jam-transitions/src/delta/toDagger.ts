import {
  Dagger,
  Delta,
  EG_Extrinsic,
  EP_Extrinsic,
  Posterior,
  Tagged,
  Tau,
  u32,
} from "@tsjam/types";
import assert from "node:assert";
import { Hashing } from "@tsjam/crypto";
import { newSTF, toTagged } from "@tsjam/utils";
import { _w } from "@/utilityComputations/w.js";
import { MAX_GAS_ACCUMULATION } from "@tsjam/constants";

type Input = {
  // We are not using the native type to avoid circular dependencies
  EP_Extrinsic: EP_Extrinsic;
  p_tau: Posterior<Tau>;

  // EG extrinsic is not a direct depenedency
  // but it's needed to calculate `w` at 141 from which
  // we assert the gas limit for accumulation phase
  EG_Extrinsic: EG_Extrinsic;
};
// (156) in graypaper
export const deltaToDagger = newSTF<Delta, Input, Dagger<Delta>>({
  assertInputValid(input, curState) {
    // (143)
    const w = _w(input.EG_Extrinsic);
    const totalGas = w
      .flatMap(({ results }) => results)
      .map(({ serviceIndex }) => {
        const service = curState.get(serviceIndex);
        assert(typeof service !== "undefined", "service index not found");
        return service;
      })
      .reduce((acc, { minGasAccumulate }) => acc + minGasAccumulate, 0n);

    assert(
      totalGas <= MAX_GAS_ACCUMULATION,
      "Gas limit exceeded for accummulation",
    );

    // (154) todo:  ep pair must be ordered by what?
    // (155) data must be solicited by a service but not yet provided
    for (const { serviceIndex, preimage } of input.EP_Extrinsic) {
      const preimageHash = Hashing.blake2b(preimage);
      const alreadyProvided = new Set(
        curState.get(serviceIndex)!.preimage_p.keys(),
      ).has(preimageHash);
      assert(!alreadyProvided, "preimage already provided");

      const inL = curState
        .get(serviceIndex)!
        .preimage_l.get(preimageHash)
        ?.get(preimage.length as Tagged<u32, "length">);
      assert(typeof inL === "undefined", "preimage already provided");
    }
  },
  assertPStateValid() {},

  apply(input: Input, curState: Delta): Dagger<Delta> {
    const result = new Map(curState) as Dagger<Delta>;
    for (const { serviceIndex, preimage } of input.EP_Extrinsic) {
      const x = result.get(serviceIndex);
      assert(typeof x !== "undefined", "service index not found");

      const hash = Hashing.blake2b(preimage);
      // clone to avoid modifying original Delta
      x!.preimage_p = new Map(x!.preimage_p);
      x!.preimage_p.set(hash, preimage);

      x!.preimage_l = new Map(x!.preimage_l);
      let plh = x!.preimage_l.get(hash) ?? new Map();
      plh = new Map(plh);
      // set
      x!.preimage_l.set(hash, plh);
      plh.set(toTagged(preimage.length as u32), toTagged([input.p_tau]));
    }
    return result;
  },
});

// TODO: implement tests
