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
  toTagged,
  u32,
} from "@vekexasia/jam-types";
import {
  epochIndex,
  isFallbackMode,
  isNewNextEra,
  slotIndex,
} from "@/utils.js";
import { bigintToBytes, E_4 } from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";
import { afterEach } from "vitest";

/**
 * it computes the posterior value of `gamma_s`
 * @see (69) and (70) in the graypaper
 * @see rotateEntropy
 */
export const computePosteriorSlotKey = (
  newSlotIndex: u32,
  curSlotIndex: u32,
  state: SafroleState,
  // used in fallbacdk
  posteriorKappa: Posterior<SafroleState["kappa"]>,
  // it means that the entropy is updates to the perspective of a new epoch
  posteriorEntropy: Posterior<SafroleState["eta"]>,
): Posterior<SafroleState["gamma_s"]> => {
  if (
    isNewNextEra(newSlotIndex, curSlotIndex) &&
    state.gamma_a.length === EPOCH_LENGTH &&
    slotIndex(curSlotIndex) >= LOTTERY_MAX_SLOT
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
  } else if (epochIndex(curSlotIndex) === epochIndex(newSlotIndex)) {
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
      const h_4 = Hashing.blake2bBuf(
        new Uint8Array([...p_eta2, ...e4Buf]),
      ).subarray(0, 4);
      const index = E_4.decode(h_4).value % BigInt(posteriorKappa.length);
      newGammaS.push(posteriorKappa[Number(index)].banderSnatch);
    }
    return newGammaS;
  }
};

if (import.meta.vitest) {
  const { vi, describe, beforeEach, expect, it } = import.meta.vitest;
  const { mockState, mockTicketIdentifier, mockValidatorData, mockHeader } =
    await import("../../test/mocks.js");

  describe("computePosteriorSlotKey", () => {
    let state: SafroleState;
    beforeEach(() => {
      state = mockState({});
      vi.spyOn(Hashing, "blake2bBuf").mockImplementation(
        () => new Uint8Array(32),
      );
    });
    describe("fallback", () => {
      let header: JamHeader;
      let posteriorKappa: Posterior<SafroleState["kappa"]>;
      let posteriorHeader: Posterior<JamHeader>;
      beforeEach(() => {
        state.gamma_a = toTagged(
          new Array(EPOCH_LENGTH).fill(mockTicketIdentifier({})),
        );
        header = mockHeader({});
        posteriorKappa = toTagged(
          new Array(NUMBER_OF_VALIDATORS).fill(0).map((_, idx) => {
            return mockValidatorData({
              banderSnatch: toTagged(BigInt(idx) as BandersnatchKey),
            });
          }),
        ) as Posterior<SafroleState["kappa"]>;
        posteriorHeader = toTagged(
          mockHeader({ timeSlotIndex: EPOCH_LENGTH + LOTTERY_MAX_SLOT }),
        );
      });
      it("fallsback if gamma a is not `EPOCH_LENGTH` long", () => {
        state.gamma_a = toTagged([]);
        const posterior = computePosteriorSlotKey(
          posteriorHeader.timeSlotIndex,
          header.timeSlotIndex,
          state,
          posteriorKappa,
          toTagged([0n, 0n, 0n, 0n]) as any,
        );
        expect(isFallbackMode(posterior)).toBeTruthy();
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(Hashing.blake2bBuf).toHaveBeenCalledTimes(EPOCH_LENGTH);
      });
      it("fallsback if epoch skipped", () => {
        const posterior = computePosteriorSlotKey(
          (EPOCH_LENGTH * 2) as u32,
          header.timeSlotIndex as u32,
          state,
          posteriorKappa,
          toTagged([0n, 0n, 0n, 0n]) as any,
        );
        expect(isFallbackMode(posterior)).toBeTruthy();
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(Hashing.blake2bBuf).toHaveBeenCalledTimes(EPOCH_LENGTH);
      });
      it("fallsback if epoch slot index is less than `LOTTERY_MAX_SLOT`", () => {
        const posterior = computePosteriorSlotKey(
          (EPOCH_LENGTH + LOTTERY_MAX_SLOT - 1) as u32,
          header.timeSlotIndex as u32,
          state,
          posteriorKappa,
          toTagged([0n, 0n, 0n, 0n]) as any,
        );
        expect(isFallbackMode(posterior)).toBeTruthy();
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(Hashing.blake2bBuf).toHaveBeenCalledTimes(EPOCH_LENGTH);
      });
    });
    describe("normal", () => {
      it("should return ticketidentifiers if not in fallback mode", () => {
        const posterior = computePosteriorSlotKey(
          EPOCH_LENGTH as u32,
          LOTTERY_MAX_SLOT as u32,
          mockState({
            gamma_a: new Array(EPOCH_LENGTH)
              .fill(0)
              .map((_, idx) => mockTicketIdentifier({ id: BigInt(idx) })),
          }),
          toTagged([]) as any,
          toTagged([]) as any,
        );
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(isFallbackMode(posterior)).toBeFalsy();
        expect((posterior[0] as TicketIdentifier).id).toEqual(0n);
        expect((posterior[1] as TicketIdentifier).id).toEqual(599n);
        expect((posterior[2] as TicketIdentifier).id).toEqual(1n);
        expect((posterior[3] as TicketIdentifier).id).toEqual(598n);
        // todo: find abetter way to test this
      });
    });
  });
}
