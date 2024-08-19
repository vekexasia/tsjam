import { SafroleState } from "@/index.js";
import {
  BandersnatchKey,
  EPOCH_LENGTH,
  JamHeader,
  LOTTERY_MAX_SLOT,
  NUMBER_OF_VALIDATORS,
  Posterior,
  SeqOfLength,
  TicketIdentifier,
  UpToSeq,
  ValidatorData,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { epochIndex, isNewNextEra, slotIndex } from "@/utils.js";
import { bigintToBytes, E, E_4 } from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";

/**
 * it computes the posterior value of `gamma_s`
 * @see (69) and (70) in the graypaper
 * @see rotateEntropy
 */
export const computePosteriorSlotKey = (
  header: JamHeader,
  posteriorHeader: Posterior<JamHeader>,
  state: SafroleState,
  // used in fallbacdk
  posteriorKappa: Posterior<SafroleState["kappa"]>,
  // it means that the entropy is updates to the perspective of a new epoch
  posteriorEntropy: Posterior<SafroleState["eta"]>,
): Posterior<SafroleState["gamma_s"]> => {
  if (
    isNewNextEra(posteriorHeader, header) &&
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
  } else if (
    epochIndex(header.timeSlotIndex) ===
    epochIndex(posteriorHeader.timeSlotIndex)
  ) {
    return state.gamma_s as Posterior<SafroleState["gamma_s"]>;
  } else {
    // we're in fallback mode
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
      const index = E.decode(h_4).value % BigInt(NUMBER_OF_VALIDATORS);
      newGammaS.push(posteriorKappa[Number(index)].banderSnatch);
    }
    return newGammaS;
  }
};

// TODO implement tests
if (import.meta.vitest) {
  const { describe, beforeEach, expect, it } = import.meta.vitest;
  describe("computePosteriorSlotKey", () => {
    let state: SafroleState;
    beforeEach(() => {
      state = {
        gamma_a: [] as unknown as UpToSeq<
          TicketIdentifier,
          typeof EPOCH_LENGTH,
          "gamma_a"
        >,
        gamma_k: [] as unknown as SeqOfLength<
          ValidatorData,
          typeof NUMBER_OF_VALIDATORS,
          "gamma_k"
        >,
        gamma_s: [] as unknown as SeqOfLength<
          TicketIdentifier,
          typeof EPOCH_LENGTH,
          "gamma_s"
        >,
        gamma_z: {
          id: BigInt(0),
          signature: BigInt(0),
        } as unknown as SafroleState["gamma_z"],
        eta: [
          BigInt(0),
          BigInt(0),
          BigInt(0),
          BigInt(0),
        ] as unknown as SafroleState["eta"],
        iota: [] as unknown as SafroleState["iota"],
        kappa: [] as unknown as SafroleState["kappa"],
        lambda: [] as unknown as SafroleState["lambda"],
        tau: 0 as unknown as SafroleState["tau"],
      };
    });
    describe("fallback", () => {
      beforeEach(() => {
        state.gamma_a = new Array(EPOCH_LENGTH).fill({
          id: BigInt(0),
          attempt: 0,
        }) as unknown as UpToSeq<
          TicketIdentifier,
          typeof EPOCH_LENGTH,
          "gamma_a"
        >;

        const h: JamHeader = {
          timeSlotIndex: 0,
          blockSeal: BigInt(0),
        };
      });
      it("fallsback if gamma a is not `EPOCH_LENGTH` long", () => {
        state.gamma_a = [
          { id: 1n as TicketIdentifier, attempt: 0 },
          { id: 2n as TicketIdentifier, attempt: 0 },
        ] as unknown as UpToSeq<
          TicketIdentifier,
          typeof EPOCH_LENGTH,
          "gamma_a"
        >;
        const posterior = computePosteriorSlotKey(
          { timeSlotIndex: 0 },
          { timeSlotIndex: 1 },
          state,
          { kappa: state.kappa, timeSlotIndex: 0 },
          { eta: state.eta, timeSlotIndex: 0 },
        );
        expect(posterior).toEqual(state.gamma_s);
      });
      it("fallsback if epoch skipped");
      it("fallsback if epoch slot index is less than `LOTTERY_MAX_SLOT`");
    });
  });
}
