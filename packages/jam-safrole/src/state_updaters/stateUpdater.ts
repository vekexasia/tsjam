import { SafroleState } from "@/index.js";
import { Posterior, u32 } from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import {
  computePosteriorEta0WithVRFOutput,
  rotateEntropy,
} from "@/state_updaters/eta.js";
import { isNewEra } from "@/utils.js";
import { rotateValidatorKeys } from "@/state_updaters/keys.js";
import {
  computeTicketIdentifiers,
  IDisputesState,
  TicketExtrinsics,
  validateTicketExtrinsic,
} from "@/extrinsics/index.js";
import { computePosteriorSlotKey } from "@/state_updaters/gammaS.js";
import { computePosteriorGammaA } from "@/state_updaters/gammaA.js";

export const computeNewSafroleState = (
  curState: SafroleState,
  newSlot: u32,
  entropy: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
  ticketExtrinsics: TicketExtrinsics,
): Posterior<SafroleState> => {
  if (curState.tau >= newSlot) {
    throw new Error("Invalid slot");
  }

  let p_eta = [
    curState.eta[0],
    curState.eta[1],
    curState.eta[2],
    curState.eta[3],
  ] as Posterior<SafroleState["eta"]>;
  let gamma_k = curState.gamma_k as Posterior<SafroleState["gamma_k"]>;
  let kappa = curState.kappa as Posterior<SafroleState["kappa"]>;
  let lambda = curState.lambda as Posterior<SafroleState["lambda"]>;
  let gamma_z = curState.gamma_z as Posterior<SafroleState["gamma_z"]>;
  if (isNewEra(newSlot, curState.tau)) {
    p_eta = rotateEntropy(p_eta);
    [gamma_k, kappa, lambda, gamma_z] = rotateValidatorKeys(curState, {
      psi_g: new Set(),
      psi_b: new Set(),
      psi_w: new Set(),
      psi_o: new Set(),
    } as Posterior<IDisputesState>);
  }

  p_eta[0] = computePosteriorEta0WithVRFOutput(curState.eta[0], entropy);

  const gamma_s = computePosteriorSlotKey(
    newSlot,
    curState.tau,
    curState,
    kappa,
    p_eta,
  );

  // Tickets and gamma A
  const identifiers = computeTicketIdentifiers(ticketExtrinsics);
  const p_gamma_a = computePosteriorGammaA(
    curState,
    newSlot,
    curState.tau,
    identifiers,
  );
  validateTicketExtrinsic(
    ticketExtrinsics,
    identifiers,
    curState,
    newSlot,
    p_eta,
    p_gamma_a,
  );
  const p_state: SafroleState = {
    ...curState,
    eta: p_eta,
    tau: newSlot,
    gamma_k,
    kappa,
    lambda,
    gamma_z,
    gamma_a: p_gamma_a,
    gamma_s,
  };
  return p_state as unknown as Posterior<SafroleState>;
};
