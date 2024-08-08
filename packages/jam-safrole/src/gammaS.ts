import { SafroleState } from "@/index.js";
import {
  BandersnatchKey,
  EPOCH_LENGTH,
  JamHeader,
  LOTTERY_MAX_SLOT,
  Posterior,
  SeqOfLength,
  TicketIdentifier,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { isNewNextEra, slotIndex } from "@/utils.js";
import { bigintToBytes, E, E_4 } from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";

/**
 * it computes the posterior value of `gamma_s`
 * it must be called {@link isNewNextEra} is true
 * @see (69) and (70) in the graypaper
 */
export const computePosteriorSlotKey = (
  header: JamHeader,
  posteriorHeader: Posterior<JamHeader>,
  state: SafroleState,
  // used in fallbacdk
  posteriorKappa: Posterior<SafroleState["kappa"]>,
  posteriorEntropy: Posterior<SafroleState["eta"]>,
): Posterior<SafroleState["gamma_s"]> => {
  assert(isNewNextEra(posteriorHeader, header), "must be a new era");
  if (
    state.gamma_a.length === EPOCH_LENGTH &&
    slotIndex(header.timeSlotIndex) >= LOTTERY_MAX_SLOT
  ) {
    // we've accumulated enough tickets
    // we can now compute the new posterior `gamma_s`
    const newGammaS = [] as unknown as Posterior<
      SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">
    >;
    // Z function (70)
    for (let i = 0; i < EPOCH_LENGTH / 2; i++) {
      newGammaS.push(state.gamma_a[i]);
      newGammaS.push(state.gamma_a[EPOCH_LENGTH - i - 1]);
    }
    return newGammaS;
  } else {
    // F(eta'_2, kappa' ) (69)
    const newGammaS = [] as unknown as Posterior<
      SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">
    >;
    const p_eta2 = bigintToBytes(posteriorEntropy[2], 32);
    // (71)
    for (let i = 0; i < EPOCH_LENGTH; i++) {
      const e4Buf = new Uint8Array(4);
      E_4.encode(BigInt(i), e4Buf);
      const h_4 = bigintToBytes(
        Hashing.blake2b(new Uint8Array([...p_eta2, ...e4Buf])),
        32,
      ).subarray(0, 4);
      const index = E.decode(h_4).value % BigInt(EPOCH_LENGTH);
      newGammaS.push(posteriorKappa[Number(index)].banderSnatch);
    }
    return newGammaS;
  }
};

// TODO implement tests
