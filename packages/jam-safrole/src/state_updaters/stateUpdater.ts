import { SafroleState } from "@/index.js";
import { Posterior, toPosterior, u32 } from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { entropyRotationSTF, eta0STF } from "@/state_updaters/eta.js";
import { rotateKeys } from "@/state_updaters/keys.js";
import { IDisputesState, TicketExtrinsics } from "@/extrinsics/index.js";
import { gamma_sSTF } from "@/state_updaters/gammaS.js";
import { gamma_aSTF } from "@/state_updaters/gammaA.js";
import { ticketExtrinsicToIdentifiersSTF } from "@/extrinsics/tickets/index.js";

export const computeNewSafroleState = (
  curState: SafroleState,
  newSlot: u32,
  entropy: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
  ticketExtrinsics: TicketExtrinsics,
): Posterior<SafroleState> => {
  if (curState.tau >= newSlot) {
    throw new Error("Invalid slot");
  }

  const tauTransition = {
    curTau: curState.tau,
    nextTau: newSlot,
  };

  const p_eta = entropyRotationSTF.apply(tauTransition, curState.eta);
  const [p_lambda, p_kappa, p_gamma_k, p_gamma_z] = rotateKeys.apply(
    {
      p_disputes: {
        psi_g: new Set(),
        psi_o: new Set(),
        psi_w: new Set(),
        psi_b: new Set(),
      } as Posterior<IDisputesState>,
      iota: curState.iota,
      tau: tauTransition,
    },
    [curState.lambda, curState.kappa, curState.gamma_k, curState.gamma_z],
  );

  p_eta[0] = eta0STF.apply(entropy, curState.eta[0]);

  const p_gamma_s = gamma_sSTF.apply(
    {
      tauTransition,
      gamma_a: curState.gamma_a,
      gamma_s: curState.gamma_s,
      p_kappa,
      p_eta,
    },
    curState.gamma_s,
  );

  const ticketIdentifiers = ticketExtrinsicToIdentifiersSTF.apply(
    {
      extrinsic: ticketExtrinsics,
      gamma_z: curState.gamma_z,
      gamma_a: curState.gamma_a,
      nextTau: tauTransition.nextTau,
      p_eta,
    },
    null,
  );
  const p_gamma_a = gamma_aSTF.apply(
    {
      tauTransition,
      newIdentifiers: ticketIdentifiers,
    },
    curState.gamma_a,
  );

  const p_state: SafroleState = {
    ...curState,
    eta: p_eta,
    tau: newSlot,
    gamma_k: p_gamma_k,
    kappa: p_kappa,
    lambda: p_lambda,
    gamma_z: p_gamma_z,
    gamma_a: p_gamma_a,
    gamma_s: p_gamma_s,
  };
  return toPosterior(p_state);
};
