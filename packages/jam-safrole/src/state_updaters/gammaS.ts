import {
  BandersnatchKey,
  JamHeader,
  Posterior,
  SafroleState,
  SeqOfLength,
  TicketIdentifier,
  u32,
} from "@vekexasia/jam-types";
import {
  epochIndex,
  isFallbackMode,
  isNewNextEra,
  slotIndex,
} from "@/utils.js";
import { E_4 } from "@vekexasia/jam-codec";
import { Hashing } from "@vekexasia/jam-crypto";
import { TauTransition } from "@/state_updaters/types.js";
import {
  EPOCH_LENGTH,
  LOTTERY_MAX_SLOT,
  NUMBER_OF_VALIDATORS,
} from "@vekexasia/jam-constants";
import {
  bigintToBytes,
  newSTF,
  toPosterior,
  toTagged,
} from "@vekexasia/jam-utils";

/**
 * it computes the posterior value of `gamma_s`
 * @see (69) and (70) in the graypaper
 * @see rotateEntropy
 */
export const gamma_sSTF = newSTF<
  SafroleState["gamma_s"],
  {
    tauTransition: TauTransition;
    gamma_a: SafroleState["gamma_a"];
    gamma_s: SafroleState["gamma_s"];
    p_kappa: Posterior<SafroleState["kappa"]>;
    p_eta: Posterior<SafroleState["eta"]>;
  }
>((input) => {
  if (
    isNewNextEra(input.tauTransition.nextTau, input.tauTransition.curTau) &&
    input.gamma_a.length === EPOCH_LENGTH &&
    slotIndex(input.tauTransition.curTau) >= LOTTERY_MAX_SLOT
  ) {
    // we've accumulated enough tickets
    // we can now compute the new posterior `gamma_s`
    const newGammaS = [] as unknown as Posterior<
      SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">
    >;
    // Z function (70)
    for (let i = 0; i < EPOCH_LENGTH / 2; i++) {
      newGammaS.push(input.gamma_a[i]);
      newGammaS.push(input.gamma_a[EPOCH_LENGTH - i - 1]);
    }
    return newGammaS;
  } else if (
    epochIndex(input.tauTransition.curTau) ===
    epochIndex(input.tauTransition.nextTau)
  ) {
    return toPosterior(input.gamma_s);
  } else {
    // we're in fallback mode
    // F(eta'_2, kappa' ) (69)
    const newGammaS = [] as unknown as Posterior<
      SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">
    >;
    const p_eta2 = bigintToBytes(input.p_eta[2], 32);
    // (71)
    for (let i = 0; i < EPOCH_LENGTH; i++) {
      const e4Buf = new Uint8Array(4);
      E_4.encode(BigInt(i), e4Buf);
      const h_4 = Hashing.blake2bBuf(
        new Uint8Array([...p_eta2, ...e4Buf]),
      ).subarray(0, 4);
      const index = E_4.decode(h_4).value % BigInt(input.p_kappa.length);
      newGammaS.push(input.p_kappa[Number(index)].banderSnatch);
    }
    return newGammaS;
  }
});

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
        const posterior = gamma_sSTF.apply(
          {
            tauTransition: {
              curTau: header.timeSlotIndex,
              nextTau: posteriorHeader.timeSlotIndex,
            },
            gamma_a: state.gamma_a,
            gamma_s: state.gamma_s,
            p_kappa: posteriorKappa,
            p_eta: toTagged([0n, 0n, 0n, 0n]) as any,
          },
          state.gamma_s,
        );
        expect(isFallbackMode(posterior)).toBeTruthy();
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(Hashing.blake2bBuf).toHaveBeenCalledTimes(EPOCH_LENGTH);
      });
      it("fallsback if epoch skipped", () => {
        const posterior = gamma_sSTF.apply(
          {
            tauTransition: {
              curTau: header.timeSlotIndex,
              nextTau: (EPOCH_LENGTH * 2) as u32,
            },
            gamma_a: state.gamma_a,
            gamma_s: state.gamma_s,
            p_kappa: posteriorKappa,
            p_eta: toTagged([0n, 0n, 0n, 0n]) as any,
          },
          state.gamma_s,
        );
        expect(isFallbackMode(posterior)).toBeTruthy();
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(Hashing.blake2bBuf).toHaveBeenCalledTimes(EPOCH_LENGTH);
      });
      it("fallsback if epoch slot index is less than `LOTTERY_MAX_SLOT`", () => {
        const posterior = gamma_sSTF.apply(
          {
            tauTransition: {
              curTau: header.timeSlotIndex,
              nextTau: (EPOCH_LENGTH + LOTTERY_MAX_SLOT - 1) as u32,
            },
            gamma_a: state.gamma_a,
            gamma_s: state.gamma_s,
            p_kappa: posteriorKappa,
            p_eta: toTagged([0n, 0n, 0n, 0n]) as any,
          },
          state.gamma_s,
        );
        expect(isFallbackMode(posterior)).toBeTruthy();
        expect(posterior.length).toEqual(EPOCH_LENGTH);
        expect(Hashing.blake2bBuf).toHaveBeenCalledTimes(EPOCH_LENGTH);
      });
    });
    describe("normal", () => {
      it("should return ticketidentifiers if not in fallback mode", () => {
        const posterior = gamma_sSTF.apply(
          {
            tauTransition: {
              curTau: LOTTERY_MAX_SLOT as u32,
              nextTau: EPOCH_LENGTH as u32,
            },
            gamma_a: toTagged(
              new Array(EPOCH_LENGTH)
                .fill(0)
                .map((_, idx) => mockTicketIdentifier({ id: BigInt(idx) })),
            ),
            gamma_s: state.gamma_s,
            p_kappa: toTagged([]) as any,
            p_eta: toTagged([]) as any,
          },
          state.gamma_s,
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
