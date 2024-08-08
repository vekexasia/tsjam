import { JamHeader, Posterior } from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { Bandersnatch, Hashing } from "@vekexasia/jam-crypto";
import { bigintToBytes } from "@vekexasia/jam-codec";

/**
 * Calculates posterior `eta_0`
 * @param header - the header to be applied
 * @param state - the current state
 * @returns the new modified eta_0
 * @see (68) in the graypaper
 */
export const entropyUpdateWithHeader = (
  header: Posterior<JamHeader>,
  state: SafroleState,
): Posterior<SafroleState["eta"][0]> => {
  return Hashing.blake2b(
    new Uint8Array([
      ...bigintToBytes(state.eta[0], 32), // eta_0
      ...bigintToBytes(
        Bandersnatch.vrfOutputSignature(header.entropySignature),
        32,
      ), // Hv
    ]),
  ) as Posterior<SafroleState["eta"][0]>;
};

/**
 * when `e'` > `e`, rotate entropy
 * @see isNewEra
 */
export const rotateEntropy = (
  state: SafroleState,
): Posterior<SafroleState["eta"]> => {
  return [state.eta[0], state.eta[0], state.eta[1], state.eta[2]] as Posterior<
    SafroleState["eta"]
  >;
};
