import {
  BandersnatchSignature,
  JamHeader,
  Posterior,
  toTagged,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { Bandersnatch, Hashing } from "@vekexasia/jam-crypto";
import { bigintToBytes } from "@vekexasia/jam-codec";

/**
 * Calculates posterior `eta_0`
 * @param header - the header to be applied
 * @param state - the current state
 * @returns the new modified eta_0
 * @see (67) in the graypaper
 */
export const entropyUpdateWithHeader = (
  header: Posterior<JamHeader>,
  state: SafroleState,
): Posterior<SafroleState["eta"][0]> => {
  return computePosteriorEta0WithSignature(
    state.eta[0],
    header.entropySignature,
  );
};

export const computePosteriorEta0WithSignature = (
  eta0: SafroleState["eta"][0],
  Hv: BandersnatchSignature,
): Posterior<SafroleState["eta"][0]> => {
  return computePosteriorEta0WithVRFOutput(
    eta0,
    Bandersnatch.vrfOutputSignature(Hv),
  );
};

export const computePosteriorEta0WithVRFOutput = (
  eta0: SafroleState["eta"][0],
  vrfOutput: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
): Posterior<SafroleState["eta"][0]> => {
  return toTagged(
    Hashing.blake2b(
      new Uint8Array([
        ...bigintToBytes(eta0, 32),
        ...bigintToBytes(vrfOutput, 32),
      ]),
    ),
  );
};

/**
 * when `e'` > `e`, rotate entropy
 * @see isNewEra
 */
export const rotateEntropy = (
  eta: SafroleState["eta"],
): Posterior<SafroleState["eta"]> => {
  return [eta[0], eta[0], eta[1], eta[2]] as Posterior<SafroleState["eta"]>;
};
