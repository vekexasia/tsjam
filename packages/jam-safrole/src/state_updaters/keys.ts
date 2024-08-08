import { JamHeader, Posterior, ValidatorData } from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { IDisputesState } from "@/extrinsics/index.js";
const emptyValidatorKeys: ValidatorData = {
  banderSnatch: 0n as unknown as ValidatorData["banderSnatch"],
  ed25519: 0n as unknown as ValidatorData["ed25519"],
  blsKey: 0n as unknown as ValidatorData["blsKey"],
  metadata: new Uint8Array(128) as unknown as ValidatorData["metadata"],
};
/**
 * Must be called when a new era starts.
 *
 * @param header
 * @param state
 * @param disputeState
 * @see 58 and 59 in the graypaper
 */
export const rotateValidatorKeys = (
  header: Posterior<JamHeader>,
  state: SafroleState,
  disputeState: Posterior<IDisputesState>,
): Posterior<SafroleState> => {
  const lambda = state.kappa as unknown as SafroleState["lambda"];
  const kappa = state.gamma_k as unknown as SafroleState["kappa"];
  // we empty the validator keys which are in ψo
  const gamma_k = state.iota.map((v) => {
    if (disputeState.psi_o.has(v.ed25519)) {
      return emptyValidatorKeys;
    }
    return v;
  }) as unknown as SafroleState["gamma_k"];
  // gamma_z is the ring root of the posterior gamma k
  const gamma_z: SafroleState["gamma_z"] = Bandersnatch.ringRoot(
    gamma_k.map((v) => v.banderSnatch),
  );
  return {
    ...state,
    lambda,
    kappa,
    gamma_k,
    gamma_z,
  } as Posterior<SafroleState>;
};
