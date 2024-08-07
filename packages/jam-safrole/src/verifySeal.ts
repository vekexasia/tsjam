import {
  BandersnatchSignature,
  JamHeader,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { isFallbackMode } from "@/utils.js";

export const verifySeal = (
  header: JamHeader,
  state: SafroleState,
): BandersnatchSignature => {
  UnsignedHeaderCodec;
  if (isFallbackMode(state.gamma_s)) {
    const k = state.gamma_s[header.timeSlotIndex % NUMBER_OF_VALIDATORS];
  } else {
    const k = state.gamma_s[header.timeSlotIndex % NUMBER_OF_VALIDATORS].id;
  }
};
