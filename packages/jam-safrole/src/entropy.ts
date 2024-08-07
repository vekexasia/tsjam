import { Blake2bHash, JamHeader } from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { Bandersnatch, Hashing } from "@vekexasia/jam-crypto";
import { bigintToBytes } from "@vekexasia/jam-codec";
import { isNewEra } from "@/utils.js";

/**
 * Calculates posterior `eta_0`
 * @param header
 * @param state
 */
export const entropyUpdateWithHeader = (
  header: JamHeader,
  state: SafroleState,
): Blake2bHash => {
  return Hashing.blake2b(
    new Uint8Array([
      ...bigintToBytes(state.eta[0], 32), // eta_0
      ...bigintToBytes(Bandersnatch.vrfOutput(header.entropySignature), 32), // Hv
    ]),
  );
};

/**
 * when `e'` > `e`, rotate entropy
 * @see isNewEra
 */
export const rotateEntropy = (
  header: JamHeader,
  currentHeader: JamHeader,
  state: SafroleState,
): SafroleState["eta"] => {
  if (isNewEra(header, currentHeader)) {
    return [state.eta[0], state.eta[0], state.eta[1], state.eta[2]];
  }
  return state.eta;
};
