import { Posterior, SafroleState, Tau } from "@vekexasia/jam-types";
import { Bandersnatch, Hashing } from "@vekexasia/jam-crypto";
import {
  bigintToBytes,
  isNewEra,
  newSTF,
  toTagged,
} from "@vekexasia/jam-utils";

export const eta0STF = newSTF<
  SafroleState["eta"][0],
  ReturnType<typeof Bandersnatch.vrfOutputSignature>
>(
  (
    input: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
    curState: SafroleState["eta"][0],
  ): Posterior<SafroleState["eta"][0]> => {
    return toTagged(
      Hashing.blake2b(
        new Uint8Array([
          ...bigintToBytes(curState, 32),
          ...bigintToBytes(input, 32),
        ]),
      ),
    );
  },
);

export const entropyRotationSTF = newSTF<
  SafroleState["eta"],
  { tau: Tau; p_tau: Posterior<Tau> }
>(
  (
    input: { tau: Tau; p_tau: Posterior<Tau> },
    eta: SafroleState["eta"],
  ): Posterior<SafroleState["eta"]> => {
    if (isNewEra(input.p_tau, input.tau)) {
      return [eta[0], eta[0], eta[1], eta[2]] as Posterior<SafroleState["eta"]>;
    }
    return eta as Posterior<SafroleState["eta"]>;
  },
);
