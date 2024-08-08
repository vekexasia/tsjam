import { JamHeader, ValidatorData } from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { IDisputesState } from "@vekexasia/jam-extrinsics";
import { Bandersnatch } from "@vekexasia/jam-crypto";
const emptyValidatorKeys: ValidatorData = {
  banderSnatch: 0n as unknown as ValidatorData["banderSnatch"],
  ed25519: 0n as unknown as ValidatorData["ed25519"],
  blsKey: 0n as unknown as ValidatorData["blsKey"],
  metadata: new Uint8Array(128) as unknown as ValidatorData["metadata"],
};
/**
 * Must be called when a new era starts.
 *
 * @param firstEpochHeader
 * @param state
 * @param posteriorDisputesState
 * @see 58 and 59 in the graypaper
 */
export const rotateValidatorKeys = (
  firstEpochHeader: JamHeader,
  state: SafroleState,
  posteriorDisputesState: IDisputesState,
) => {
  state.lambda = state.kappa as unknown as SafroleState["lambda"];
  state.kappa = state.gamma_k as unknown as SafroleState["kappa"];
  // we empty the validator keys which are in ψo
  state.gamma_k = state.iota.map((v) => {
    if (posteriorDisputesState.psi_o.has(v.ed25519)) {
      return emptyValidatorKeys;
    }
    return v;
  }) as unknown as SafroleState["gamma_k"];
  // gamma_z is the ring root of the posterior gamma k
  state.gamma_z = Bandersnatch.ringRoot(
    state.gamma_k.map((v) => v.banderSnatch),
  );
};
