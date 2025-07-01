import { Hashing } from "@tsjam/crypto";
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
  Validated,
  u32,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok } from "neverthrow";
import { compareUint8Arrays } from "uint8array-extras";
import { preimageSolicitedButNotYetProvided } from "../../../jam-serviceaccounts/dist/types/utils";

type Input = {
  EP_Extrinsic: Validated<EP_Extrinsic>;
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
  // $(0.7.0 - 12.42)
  const p = input.EP_Extrinsic.filter((ep) =>
    preimageSolicitedButNotYetProvided(
      curState,
      ep.serviceIndex,
      Hashing.blake2b(ep.preimage),
      ep.preimage.length,
    ),
  );

  const result = structuredClone(curState);
  // $(0.7.0 - 12.43)
  for (const { serviceIndex, preimage } of p) {
    const x = result.get(serviceIndex)!;

    const hash = Hashing.blake2b(preimage);
    x.preimages.set(hash, preimage);

    x.requests.set(hash, x.requests.get(hash) ?? new Map());
    x.requests
      .get(hash)!
      .set(toTagged(<u32>preimage.length), toTagged([input.p_tau]));
  }
  return ok(toTagged(result));
};
