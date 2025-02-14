import {
  Delta,
  DoubleDagger,
  EP_Extrinsic,
  Hash,
  Posterior,
  STF,
  ServiceIndex,
  Tagged,
  Tau,
  u32,
} from "@tsjam/types";
import { Hashing } from "@tsjam/crypto";
import { toTagged } from "@tsjam/utils";
import { err, ok } from "neverthrow";
import { compareUint8Arrays } from "uint8array-extras";

type Input = {
  EP_Extrinsic: EP_Extrinsic;
  delta: Delta;
  p_tau: Posterior<Tau>;
};

export enum DeltaToPosteriorError {
  PREIMAGE_PROVIDED_OR_UNSOLICITED = "Preimage Provided or unsolicied",
  PREIMAGES_NOT_SORTED = "preimages should be sorted",
}

export const deltaToPosterior: STF<
  DoubleDagger<Delta>,
  Input,
  DeltaToPosteriorError,
  Posterior<Delta>
> = (input, curState) => {
  // $(0.6.1 - 12.29)
  for (let i = 1; i < input.EP_Extrinsic.length; i++) {
    const prev = input.EP_Extrinsic[i - 1];
    if (prev.serviceIndex > input.EP_Extrinsic[i].serviceIndex) {
      return err(DeltaToPosteriorError.PREIMAGES_NOT_SORTED);
    } else if (prev.serviceIndex === input.EP_Extrinsic[i].serviceIndex) {
      const comparisonResult = compareUint8Arrays(
        prev.preimage,
        input.EP_Extrinsic[i].preimage,
      );
      if (comparisonResult !== -1) {
        return err(DeltaToPosteriorError.PREIMAGES_NOT_SORTED);
      }
    }
    // compare now the two preimages
  }

  // $(0.6.1 - 12.30)
  const R_fn = (d: Delta, s: ServiceIndex, h: Hash, l: number) => {
    const alreadyProvided = new Set(d.get(s)!.preimage_p.keys()).has(h);
    if (alreadyProvided) {
      return false;
    }

    const inL = d
      .get(s)!
      .preimage_l.get(h)
      ?.get(l as Tagged<u32, "length">);
    if (inL?.length !== 0) {
      return false;
    }

    return true;
  };

  // $(0.6.1 - 12.31) data must be solicited by a service but not yet provided
  for (const { serviceIndex, preimage } of input.EP_Extrinsic) {
    if (
      !R_fn(
        input.delta,
        serviceIndex,
        Hashing.blake2b(preimage),
        preimage.length,
      )
    ) {
      return err(DeltaToPosteriorError.PREIMAGE_PROVIDED_OR_UNSOLICITED);
    }
  }

  // $(0.6.1 - 12.32)
  const P = input.EP_Extrinsic.filter((ep) =>
    R_fn(
      curState,
      ep.serviceIndex,
      Hashing.blake2b(ep.preimage),
      ep.preimage.length,
    ),
  );

  const result = new Map(curState) as Posterior<Delta>;
  // $(0.6.1 - 12.33)
  for (const { serviceIndex, preimage } of P) {
    const x = result.get(serviceIndex);

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
