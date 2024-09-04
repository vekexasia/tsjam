import {
  BandersnatchKey,
  IDisputesState,
  JamHeader,
  OpaqueHash,
  Posterior,
  SafroleState,
  SeqOfLength,
  TicketIdentifier,
  ValidatorData,
} from "@vekexasia/jam-types";
import { EPOCH_LENGTH } from "@vekexasia/jam-constants";
import { isFallbackMode } from "@vekexasia/jam-utils";
/**
 * `Ha` in the graypaper
 * @param header - the header of the blockj
 * @param state - the state of the safrole state machine
 */
export const getBlockAuthorKey = (header: JamHeader, state: SafroleState) => {
  if (isFallbackMode(state.gamma_s)) {
    return state.gamma_s[header.timeSlotIndex % EPOCH_LENGTH];
  } else {
    //return state.gamma_s[header.timeSlotIndex % EPOCH_LENGTH].id;
    // TODO: implment how to get key - see (43) in the graypaper
    const k = state.kappa[header.blockAuthorKeyIndex];
    return k.banderSnatch;
  }
};
