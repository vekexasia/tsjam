import { SafroleState } from "@/index.js";
import { TicketExtrinsics } from "@/extrinsics/index.js";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import {
  EPOCH_LENGTH,
  JamHeader,
  Posterior,
  TicketIdentifier,
} from "@vekexasia/jam-types";
import { isNewEra } from "@/utils.js";

/**
 * update `gamma_a` (79)
 */
export const computePosteriorGammaA = (
  state: SafroleState,
  header: JamHeader,
  p_header: Posterior<JamHeader>,
  newIdentifiers: TicketIdentifier[],
): Posterior<SafroleState["gamma_a"]> => {
  if (!isNewEra(p_header, header)) {
    return state.gamma_a as Posterior<SafroleState["gamma_a"]>;
  }
  return [...newIdentifiers, ...state.gamma_a]
    .sort((a, b) => (a.id - b.id < 0 ? -1 : 1))
    .slice(0, EPOCH_LENGTH) as Posterior<SafroleState["gamma_a"]>;
};
