import {
  IDisputesState,
  Posterior,
  SafroleState,
  Tau,
} from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { entropyRotationSTF, eta0STF } from "@/safrole/eta.js";
import { rotateKeys } from "@/safrole/keys.js";
import { gamma_sSTF } from "@/safrole/gammaS.js";
import { gamma_aSTF } from "@/safrole/gammaA.js";
import { TicketExtrinsics } from "@vekexasia/jam-types";
import { toPosterior } from "@vekexasia/jam-utils";
import { ticketExtrinsicToIdentifiersSTF } from "@/tickets.js";

export const computeNewSafroleState = (
  curState: SafroleState,
  newSlot: Posterior<Tau>,
  entropy: ReturnType<typeof Bandersnatch.vrfOutputSignature>,
  ticketExtrinsics: TicketExtrinsics,
): Posterior<SafroleState> => {
  if (curState.tau >= newSlot) {
    throw new Error("Invalid slot");
  }

  const tauTransition = {
    tau: curState.tau,
    p_tau: newSlot,
  };

  const p_eta = entropyRotationSTF.apply(tauTransition, curState.eta);
  const [p_lambda, p_kappa, p_gamma_k, p_gamma_z] = rotateKeys.apply(
    {
      p_psi_o: new Set() as Posterior<IDisputesState["psi_o"]>,
      iota: curState.iota,
      ...tauTransition,
    },
    [curState.lambda, curState.kappa, curState.gamma_k, curState.gamma_z],
  );

  p_eta[0] = eta0STF.apply(entropy, curState.eta[0]);

  const p_gamma_s = gamma_sSTF.apply(
    {
      ...tauTransition,
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
      ...tauTransition,
      p_eta,
    },
    null,
  );
  const p_gamma_a = gamma_aSTF.apply(
    {
      ...tauTransition,
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
