import {
  IDisputesState,
  Posterior,
  SafroleState,
  newSTF,
  toPosterior,
  toTagged,
} from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { afterAll, beforeEach } from "vitest";
import { TauTransition } from "@/state_updaters/types.js";
import { PHI_FN, isNewEra } from "@/utils.js";

// 58 and 59 in the graypaper
export const rotateLambdaSTF = newSTF<
  SafroleState["lambda"],
  SafroleState["kappa"]
>(
  (kappa): Posterior<SafroleState["lambda"]> =>
    [...kappa] as unknown as Posterior<SafroleState["lambda"]>,
);

export const rotateKappaSTF = newSTF<
  SafroleState["kappa"],
  SafroleState["gamma_k"]
>(
  (input): Posterior<SafroleState["kappa"]> =>
    [...input] as unknown as Posterior<SafroleState["kappa"]>,
);
export const rotateGammaKSTF = newSTF<
  SafroleState["gamma_k"],
  { iota: SafroleState["iota"]; p_psi_o: Posterior<IDisputesState["psi_o"]> }
>(
  (input): Posterior<SafroleState["gamma_k"]> =>
    // we empty the validator keys which are in ψo
    PHI_FN(input.iota, input.p_psi_o) as unknown as Posterior<
      SafroleState["gamma_k"]
    >,
);
export const rotateGammaZSTF = newSTF<
  SafroleState["gamma_z"],
  Posterior<SafroleState["gamma_k"]>
>((p_gamma_k): Posterior<SafroleState["gamma_z"]> => {
  // gamma_z is the ring root of the posterior gamma
  return Bandersnatch.ringRoot(p_gamma_k.map((v) => v.banderSnatch));
});
export const rotateKeys = newSTF<
  [
    SafroleState["lambda"],
    SafroleState["kappa"],
    SafroleState["gamma_k"],
    SafroleState["gamma_z"],
  ],
  {
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
    iota: SafroleState["iota"];
    tau: TauTransition;
  },
  [
    Posterior<SafroleState["lambda"]>,
    Posterior<SafroleState["kappa"]>,
    Posterior<SafroleState["gamma_k"]>,
    Posterior<SafroleState["gamma_z"]>,
  ]
>(({ p_psi_o, iota, tau }, [lambda, kappa, gamma_k, gamma_z]) => {
  if (isNewEra(tau.nextTau, tau.curTau)) {
    const p_gamma_k = rotateGammaKSTF.apply({ iota, p_psi_o }, gamma_k);
    const p_kappa = rotateKappaSTF.apply(gamma_k, kappa);
    const p_lambda = rotateLambdaSTF.apply(kappa, lambda);
    const p_gamma_z = rotateGammaZSTF.apply(p_gamma_k, gamma_z);
    return [p_lambda, p_kappa, p_gamma_k, p_gamma_z];
  }
  return [
    toPosterior(lambda),
    toPosterior(kappa),
    toPosterior(gamma_k),
    toPosterior(gamma_z),
  ];
});

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;
  const { mockState, mockDisputesState, mockValidatorData } = await import(
    "../../test/mocks.js"
  );

  describe("rotateValidatorKeys", () => {
    beforeEach(() => {
      vi.spyOn(Bandersnatch, "ringRoot").mockImplementationOnce(() =>
        toTagged(0n),
      );
    });
    afterAll(() => {
      vi.restoreAllMocks();
    });
    describe("rotation", () => {
      it("should assign yk to k'", () => {
        const state = mockState({
          gamma_k: [mockValidatorData({ ed25519: 1n })],
          kappa: [mockValidatorData({ ed25519: 2n })],
        });
        const r = rotateKappaSTF.apply(state.gamma_k, state.kappa);
        expect(r).toEqual(state.gamma_k);
      });
      it("should assign k to lambda'", () => {
        const state = mockState({
          kappa: [mockValidatorData({ ed25519: 1n })],
        });
        const r = rotateLambdaSTF.apply(state.kappa, state.lambda);

        expect(r).toEqual(state.kappa);
      });
      it("should assign iota minus disputes to gamma_k'", () => {
        const state = mockState({
          iota: [
            mockValidatorData({ ed25519: 1n }),
            mockValidatorData({ ed25519: 2n }),
          ],
        });
        const p_disputes = mockDisputesState({
          psi_o: new Set([1n]) as unknown as IDisputesState["psi_o"],
        }) as unknown as Posterior<IDisputesState>;
        const r = rotateGammaKSTF.apply(
          {
            iota: state.iota,
            p_psi_o: p_disputes.psi_o as unknown as Posterior<
              IDisputesState["psi_o"]
            >,
          },
          state.gamma_k,
        );
        expect(r).toEqual([
          {
            banderSnatch: 0n,
            ed25519: 0n,
            blsKey: new Uint8Array(144).fill(0),
            metadata: new Uint8Array(128).fill(0),
          },
          mockValidatorData({ ed25519: 2n }),
        ]);
      });
      it("should assign ringroot (of gamma k ) to gamma_z'", () => {
        vi.spyOn(Bandersnatch, "ringRoot").mockImplementationOnce(() =>
          toTagged(42n),
        );
        const state = mockState({
          gamma_k: [mockValidatorData({ banderSnatch: 1n })],
        });
        const p_gamma_k = state.gamma_k as Posterior<SafroleState["gamma_k"]>;
        const r = rotateGammaZSTF.apply(p_gamma_k, state.gamma_z);
        expect(r).toEqual(42n);
      });
    });
  });
}
