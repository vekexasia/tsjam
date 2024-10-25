import { Posterior, SafroleState } from "@tsjam/types";
import { newSTF, toPosterior } from "@tsjam/utils";

export const safroleToPosterior = newSTF<
  SafroleState,
  {
    p_gamma_z: Posterior<SafroleState["gamma_z"]>;
    p_gamma_k: Posterior<SafroleState["gamma_k"]>;
    p_gamma_s: Posterior<SafroleState["gamma_s"]>;
    p_gamma_a: Posterior<SafroleState["gamma_a"]>;
  }
>((input) => {
  return computeNewSafroleState(
    input.p_gamma_s,
    input.p_gamma_a,
    input.p_gamma_z,
    input.p_gamma_k,
  );
});

export const computeNewSafroleState = (
  p_gamma_s: Posterior<SafroleState["gamma_s"]>,
  p_gamma_a: Posterior<SafroleState["gamma_a"]>,
  p_gamma_z: Posterior<SafroleState["gamma_z"]>,
  p_gamma_k: Posterior<SafroleState["gamma_k"]>,
): Posterior<SafroleState> => {
  const p_state: SafroleState = {
    gamma_k: p_gamma_k,
    gamma_z: p_gamma_z,
    gamma_a: p_gamma_a,
    gamma_s: p_gamma_s,
  };
  return toPosterior(p_state);
};
