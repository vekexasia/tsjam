import {
  BandersnatchKey,
  BandersnatchSignature,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
  JamHeader,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { isFallbackMode } from "@/utils.js";
import { bigintToBytes, UnsignedHeaderCodec } from "@vekexasia/jam-codec";
import { Bandersnatch } from "@vekexasia/jam-crypto";

export const verifySeal = (
  header: JamHeader,
  state: SafroleState,
  signature: BandersnatchSignature,
): boolean => {
  // TODO: precompute max size and allocate temp buffer
  const tmpArray = new Uint8Array(1024 * 1024);

  const size = UnsignedHeaderCodec.encode(header, tmpArray);
  if (isFallbackMode(state.gamma_s)) {
    const k = state.gamma_s[header.timeSlotIndex % NUMBER_OF_VALIDATORS];
    return Bandersnatch.verifySignature(
      signature,
      k,
      tmpArray.subarray(0, size), // message,
      new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...bigintToBytes(state.eta[3], 32),
      ]), // context
    );
  } else {
    const k = state.gamma_s[header.timeSlotIndex % NUMBER_OF_VALIDATORS];
    // TODO: implment how to get key asd

    return Bandersnatch.verifySignature(
      signature,
      null as unknown as BandersnatchKey,
      tmpArray.subarray(0, size), // message,
      new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...bigintToBytes(state.eta[3], 32),
        k.attempt, // i_r
      ]), // context
    );
    //
  }
};
