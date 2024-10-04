import {
  G_Star,
  GuarantorsAssignment,
  Hash,
  IDisputesState,
  Posterior,
  SafroleState,
  Tau,
  u32,
} from "@vekexasia/jam-types";
import { FisherYatesH } from "@vekexasia/jam-crypto";
import {
  CORES,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
} from "@vekexasia/jam-constants";
import { slotIndex } from "@vekexasia/jam-utils";
import { PHI_FN } from "@/safrole/keys.js";

/**
 * (134) in the graypaper
 * also handles the (135) in the graypaper
 */
const G_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: Posterior<Tau>;
  validatorKeys: Posterior<SafroleState["kappa"] | SafroleState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
}) => {
  // R(c,n) = [(x + n) mod CORES | x E c]
  const R = (c: number[], n: number) => c.map((x) => (x + n) % CORES);
  // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
  const P = (e: Hash, t: Tau) => {
    return R(
      FisherYatesH(
        Array.from({ length: NUMBER_OF_VALIDATORS }, (_, i) =>
          Math.floor((CORES * i) / NUMBER_OF_VALIDATORS),
        ),
        e,
      ),
      Math.floor(slotIndex(t) / VALIDATOR_CORE_ROTATION),
    );
  };
  return {
    validatorsAssignedCore: P(
      input.entropy,
      (input.p_tau + input.tauOffset) as Tau,
    ),
    validatorsED22519Key: PHI_FN(input.validatorKeys, input.p_psi_o).map(
      (v) => v.ed25519,
    ),
  } as GuarantorsAssignment;
};

/**
 * (135) in the graypaper
 */
export const G_STAR_fn = (input: {
  p_eta2: Posterior<SafroleState["eta"][2]>;
  p_eta3: Posterior<SafroleState["eta"][3]>;
  p_kappa: Posterior<SafroleState["kappa"]>;
  p_lambda: Posterior<SafroleState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
  p_tau: Posterior<Tau>;
}) => {
  if (
    slotIndex((input.p_tau - VALIDATOR_CORE_ROTATION) as Tau) ==
    slotIndex(input.p_tau)
  ) {
    return G_fn({
      entropy: input.p_eta2,
      tauOffset: 0 as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_kappa,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  } else {
    return G_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.p_tau,
      validatorKeys: input.p_lambda,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  }
};
