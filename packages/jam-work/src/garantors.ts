import {
  CoreIndex,
  ED25519PublicKey,
  Hash,
  IDisputesState,
  Posterior,
  SafroleState,
  SeqOfLength,
  Tagged,
  newSTF,
  toPosterior,
  toTagged,
  u32,
} from "@vekexasia/jam-types";
import { PHI_FN, TauTransition, slotIndex } from "@vekexasia/jam-safrole";
import { FisherYatesH } from "@vekexasia/jam-crypto";
import {
  CORES,
  NUMBER_OF_VALIDATORS,
  VALIDATOR_CORE_ROTATION,
} from "@vekexasia/jam-constants";

/**
 * Guarantors assignments. Every block each core has 3 validators assigned to guarantee work reports for it
 * section 11.3
 */
export type GuarantorsAssignment = {
  /**
   * `c` - the core index
   */
  validatorsAssignedCore: SeqOfLength<CoreIndex, typeof NUMBER_OF_VALIDATORS>;

  /**
   * `v` - the validators' public key
   */
  validatorsED22519Key: SeqOfLength<
    ED25519PublicKey,
    typeof NUMBER_OF_VALIDATORS
  >;
};

export type G_Star = Tagged<GuarantorsAssignment, "G*">;

/**
 * (134) in the graypaper
 * also handles the (135) in the graypaper
 */
const G_fn = (input: {
  entropy: Hash;
  tauOffset: u32;
  p_tau: TauTransition["nextTau"];
  validatorKeys: Posterior<SafroleState["kappa"] | SafroleState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
}) => {
  // R(c,n) = [(x + n) mod CORES | x E c]
  const R = (c: number[], n: number) => c.map((x) => (x + n) % CORES);
  // P(e,t) = R(F([floor(CORES * i / NUMBER_OF_VALIDATORS) | i E NUMBER_OF_VALIDATORS], e), floor(t mod EPOCH_LENGTH/ R))
  const P = (e: Hash, t: u32) => {
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
      toTagged(input.p_tau + input.tauOffset),
    ),
    validatorsED22519Key: PHI_FN(input.validatorKeys, input.p_psi_o).map(
      (v) => v.ed25519,
    ),
  } as GuarantorsAssignment;
};

/**
 * (135) in the graypaper
 * @param input
 * @constructor
 */
export const G_STAR_fn = (input: {
  p_eta2: Posterior<SafroleState["eta"][2]>;
  p_eta3: Posterior<SafroleState["eta"][3]>;
  p_kappa: Posterior<SafroleState["kappa"]>;
  p_lambda: Posterior<SafroleState["lambda"]>;
  p_psi_o: Posterior<IDisputesState["psi_o"]>;
  nextTau: TauTransition["nextTau"];
}) => {
  if (
    slotIndex(input.nextTau - VALIDATOR_CORE_ROTATION) ==
    slotIndex(input.nextTau)
  ) {
    return G_fn({
      entropy: input.p_eta2,
      tauOffset: 0 as u32,
      p_tau: input.nextTau,
      validatorKeys: input.p_kappa,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  } else {
    return G_fn({
      entropy: input.p_eta3,
      tauOffset: -VALIDATOR_CORE_ROTATION as u32,
      p_tau: input.nextTau,
      validatorKeys: input.p_lambda,
      p_psi_o: input.p_psi_o,
    }) as G_Star;
  }
};

/**
 * Guarantors assignment STF
 */
export const GuarantorsAssignment_stf = newSTF<
  GuarantorsAssignment,
  {
    p_eta2: Posterior<SafroleState["eta"][2]>;
    tauTransition: TauTransition;
    p_kappa: Posterior<SafroleState["kappa"]>;
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
  }
>((input) => {
  return toPosterior(
    G_fn({
      entropy: input.p_eta2,
      tauOffset: 0 as u32,
      p_tau: input.tauTransition.nextTau,
      validatorKeys: input.p_kappa,
      p_psi_o: input.p_psi_o,
    }),
  );
});

export const GuarantorsAssignment_stf_STAR = newSTF<
  G_Star,
  {
    p_eta2: Posterior<SafroleState["eta"][2]>;
    p_eta3: Posterior<SafroleState["eta"][3]>;
    p_kappa: Posterior<SafroleState["kappa"]>;
    p_lambda: Posterior<SafroleState["lambda"]>;
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
    nextTau: TauTransition["nextTau"];
  }
>((input) => {
  return toPosterior(G_STAR_fn(input));
});
