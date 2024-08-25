import { Posterior, toTagged, newSTF } from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { Bandersnatch, Hashing } from "@vekexasia/jam-crypto";
import { bigintToBytes } from "@vekexasia/jam-codec";
import { isNewEra } from "@/utils.js";
import { TauTransition } from "@/state_updaters/types.js";

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

export const entropyRotationSTF = newSTF<SafroleState["eta"], TauTransition>(
  (
    input: TauTransition,
    eta: SafroleState["eta"],
  ): Posterior<SafroleState["eta"]> => {
    if (isNewEra(input.nextTau, input.curTau)) {
      return [eta[0], eta[0], eta[1], eta[2]] as Posterior<SafroleState["eta"]>;
    }
    return eta as Posterior<SafroleState["eta"]>;
  },
);
