import {
  Dagger,
  Delta,
  EG_Extrinsic,
  EP_Extrinsic,
  Posterior,
  STF,
  Tagged,
  Tau,
  u32,
} from "@tsjam/types";
import { Hashing } from "@tsjam/crypto";
import { toTagged } from "@tsjam/utils";
import { _w } from "@/utilityComputations/w.js";
import { MAX_GAS_ACCUMULATION } from "@tsjam/constants";
import { Result, err, ok } from "neverthrow";

type Input = {
  // We are not using the native type to avoid circular dependencies
  EP_Extrinsic: EP_Extrinsic;
  p_tau: Posterior<Tau>;

  // EG extrinsic is not a direct depenedency
  // but it's needed to calculate `w` at 141 from which
  // we assert the gas limit for accumulation phase
  EG_Extrinsic: EG_Extrinsic;
};

export enum DeltaToDaggerError {
  GAS_LIMIT_EXCEEDED = "Gas limit exceeded for accummulation",
  PREIMAGE_ALREADY_PROVIDED = "preimage already provided",
  SERVICE_INDEX_NOT_FOUND = "service index not found",
  PREIMAGE_LENGTH_ALREADY_PROVIDED = "preimage already provided",
  PREIMAGES_NOT_SORTED = "preimages should be sorted",
}

// (161) in graypaper
export const deltaToDagger: STF<
  Delta,
  Input,
  DeltaToDaggerError,
  Dagger<Delta>
> = (input, curState) => {
  const w = _w(input.EG_Extrinsic);
  const results = w.flatMap(({ results }) => results);
  // (143)
  if (results.find((item) => !curState.has(item.serviceIndex))) {
    return err(DeltaToDaggerError.SERVICE_INDEX_NOT_FOUND);
  }

  const totalGas = results
    .map(({ serviceIndex }) => curState.get(serviceIndex)!)
    .reduce((acc, { minGasAccumulate }) => acc + minGasAccumulate, 0n);

  if (totalGas > MAX_GAS_ACCUMULATION) {
    return err(DeltaToDaggerError.GAS_LIMIT_EXCEEDED);
  }

  // (158) todo:  ep pair must be ordered by what?
  for (let i = 1; i < input.EP_Extrinsic.length; i++) {
    const prev = input.EP_Extrinsic[i - 1];
    if (prev.serviceIndex > input.EP_Extrinsic[i].serviceIndex) {
      return err(DeltaToDaggerError.PREIMAGES_NOT_SORTED);
    }
  }

  // (160) data must be solicited by a service but not yet provided
  for (const { serviceIndex, preimage } of input.EP_Extrinsic) {
    const preimageHash = Hashing.blake2b(preimage);
    const alreadyProvided = new Set(
      curState.get(serviceIndex)!.preimage_p.keys(),
    ).has(preimageHash);
    if (alreadyProvided) {
      return err(DeltaToDaggerError.PREIMAGE_ALREADY_PROVIDED);
    }

    const inL = curState
      .get(serviceIndex)!
      .preimage_l.get(preimageHash)
      ?.get(preimage.length as Tagged<u32, "length">);
    if (typeof inL !== "undefined") {
      return err(DeltaToDaggerError.PREIMAGE_LENGTH_ALREADY_PROVIDED);
    }
  }
  const result = new Map(curState) as Dagger<Delta>;
  for (const { serviceIndex, preimage } of input.EP_Extrinsic) {
    const x = result.get(serviceIndex);
    if (typeof x === "undefined") {
      return err(DeltaToDaggerError.SERVICE_INDEX_NOT_FOUND);
    }

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
  return ok(result);
};
