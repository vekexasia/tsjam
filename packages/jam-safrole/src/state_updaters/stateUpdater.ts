import { SafroleState } from "@/index.js";
import { Posterior, toTagged, u32 } from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import {
  computePosteriorEta0WithVRFOutput,
  rotateEntropy,
} from "@/state_updaters/eta.js";
import { isNewEra } from "@/utils.js";

export const computeNewSafroleState = (
  curState: SafroleState,
  newSlot: u32,
  entropy: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
): Posterior<SafroleState> => {
  if (curState.tau >= newSlot) {
    throw new Error("Invalid slot");
  }

  let p_eta: SafroleState["eta"] = [
    curState.eta[0],
    curState.eta[1],
    curState.eta[2],
    curState.eta[3],
  ];
  if (isNewEra(newSlot, curState.tau)) {
    p_eta = rotateEntropy(p_eta);
  }

  p_eta[0] = computePosteriorEta0WithVRFOutput(curState.eta[0], entropy);

  const p_state: SafroleState = {
    ...curState,
    eta: p_eta,
    tau: newSlot,
  };
  return p_state as unknown as Posterior<SafroleState>;
};
