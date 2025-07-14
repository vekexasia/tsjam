import { Posterior, STF, SafroleState } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { ok } from "neverthrow";

export const safroleToPosterior: STF<
  SafroleState,
  {
    p_gamma_z: Posterior<SafroleState["gamma_z"]>;
    p_gamma_p: Posterior<SafroleState["gamma_p"]>;
    p_gamma_s: Posterior<SafroleState["gamma_s"]>;
    p_gamma_a: Posterior<SafroleState["gamma_a"]>;
  },
  never
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
> = (input, _) => {
  return ok(
    computeNewSafroleState(
      input.p_gamma_s,
      input.p_gamma_a,
      input.p_gamma_z,
      input.p_gamma_p,
    ),
  );
};

export const computeNewSafroleState = (
  p_gamma_s: Posterior<SafroleState["gamma_s"]>,
  p_gamma_a: Posterior<SafroleState["gamma_a"]>,
  p_gamma_z: Posterior<SafroleState["gamma_z"]>,
  p_gamma_p: Posterior<SafroleState["gamma_p"]>,
): Posterior<SafroleState> => {
  const p_state: SafroleState = {
    gamma_p: p_gamma_p,
    gamma_z: p_gamma_z,
    gamma_a: p_gamma_a,
    gamma_s: p_gamma_s,
  };
  return toPosterior(p_state);
};
