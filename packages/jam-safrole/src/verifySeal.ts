import {
  BandersnatchSignature,
  JamHeader,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { isFallbackMode } from "@/utils.js";
import { UnsignedHeaderCodec } from "@vekexasia/jam-codec";

export const verifySeal = (
  header: JamHeader,
  state: SafroleState,
): BandersnatchSignature => {
  // TODO: precompute max size and allocate temp buffer
  const tmpArray = new Uint8Array(1024 * 1024);

  const size = UnsignedHeaderCodec.encode(header, tmpArray);
  if (isFallbackMode(state.gamma_s)) {
    const k = state.gamma_s[header.timeSlotIndex % NUMBER_OF_VALIDATORS];
  } else {
    const k = state.gamma_s[header.timeSlotIndex % NUMBER_OF_VALIDATORS].id;
  }
};
