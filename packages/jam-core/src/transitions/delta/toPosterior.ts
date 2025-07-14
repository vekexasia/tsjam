import { Hashing } from "@tsjam/crypto";
import { preimageSolicitedButNotYetProvided } from "@tsjam/serviceaccounts";
import {
  Delta,
  DoubleDagger,
  EP_Extrinsic,
  Posterior,
  STF,
  Tau,
  Validated,
  u32,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";

export const deltaToPosterior: STF<
  DoubleDagger<Delta>,
  {
    ep: Validated<EP_Extrinsic>;
    p_tau: Posterior<Tau>;
  },
  never,
  Posterior<Delta>
> = (input, curState) => {
  // $(0.7.0 - 12.42)
  const p = input.ep.filter((ep) =>
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
