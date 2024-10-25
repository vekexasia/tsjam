import {
  BandersnatchKey,
  JamEntropy,
  JamHeader,
  JamState,
  Posterior,
  SafroleState,
  SeqOfLength,
  Tau,
  TicketIdentifier,
} from "@tsjam/types";
import { E_4 } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  EPOCH_LENGTH,
  LOTTERY_MAX_SLOT,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import {
  bigintToBytes,
  epochIndex,
  isFallbackMode,
  isNewNextEra,
  newSTF,
  slotIndex,
  toPosterior,
  toTagged,
} from "@tsjam/utils";

/**
 * it computes the posterior value of `gamma_s`
 * @see (69) and (70) in the graypaper
 * @see rotateEntropy
 */
export const gamma_sSTF = newSTF<
  SafroleState["gamma_s"],
  {
    tau: Tau;
    p_tau: Posterior<Tau>;
    gamma_a: SafroleState["gamma_a"];
    gamma_s: SafroleState["gamma_s"];
    p_kappa: Posterior<JamState["kappa"]>;
    p_eta: Posterior<JamEntropy>;
  }
>((input) => {
  if (
    isNewNextEra(input.p_tau, input.tau) &&
    input.gamma_a.length === EPOCH_LENGTH &&
    slotIndex(input.tau) >= LOTTERY_MAX_SLOT
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
  } else if (epochIndex(input.tau) === epochIndex(input.p_tau)) {
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
    await import("../../test/safroleMocks.js");

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
      let posteriorKappa: Posterior<JamState["kappa"]>;
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
        ) as Posterior<JamState["kappa"]>;
        posteriorHeader = toPosterior(
          mockHeader({ timeSlotIndex: EPOCH_LENGTH + LOTTERY_MAX_SLOT }),
        );
      });
      it("fallsback if gamma a is not `EPOCH_LENGTH` long", () => {
        state.gamma_a = toTagged([]);
        const posterior = gamma_sSTF.apply(
          {
            tau: header.timeSlotIndex,
            p_tau: toPosterior(posteriorHeader.timeSlotIndex),
            gamma_a: state.gamma_a,
            gamma_s: state.gamma_s,
            p_kappa: posteriorKappa,
            p_eta: toTagged([0n, 0n, 0n, 0n]) as Posterior<JamEntropy>,
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
            tau: header.timeSlotIndex,
            p_tau: (EPOCH_LENGTH * 2) as Posterior<Tau>,
            gamma_a: state.gamma_a,
            gamma_s: state.gamma_s,
            p_kappa: posteriorKappa,
            p_eta: toTagged([0n, 0n, 0n, 0n]) as Posterior<JamEntropy>,
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
            tau: header.timeSlotIndex,
            p_tau: (EPOCH_LENGTH + LOTTERY_MAX_SLOT - 1) as Posterior<Tau>,
            gamma_a: state.gamma_a,
            gamma_s: state.gamma_s,
            p_kappa: posteriorKappa,
            p_eta: toTagged([0n, 0n, 0n, 0n]) as Posterior<JamEntropy>,
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
            tau: LOTTERY_MAX_SLOT as Posterior<Tau>,
            p_tau: EPOCH_LENGTH as Posterior<Tau>,
            gamma_a: toTagged(
              new Array(EPOCH_LENGTH)
                .fill(0)
                .map((_, idx) => mockTicketIdentifier({ id: BigInt(idx) })),
            ),
            gamma_s: state.gamma_s,
            p_kappa: [] as unknown as Posterior<JamState["kappa"]>,
            p_eta: [] as unknown as Posterior<JamEntropy>,
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
