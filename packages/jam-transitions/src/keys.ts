import {
  BandersnatchKey,
  IDisputesState,
  JamState,
  OpaqueHash,
  Posterior,
  STF,
  SafroleState,
  SeqOfLength,
  Tau,
  TicketIdentifier,
  ValidatorData,
} from "@tsjam/types";
import { Bandersnatch } from "@tsjam/crypto";
import { afterAll, beforeEach } from "vitest";
import { isFallbackMode, isNewEra, toPosterior, toTagged } from "@tsjam/utils";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { Result, ok } from "neverthrow";

/**
 * Phi function
 * returns the validator keys which are not in ψo. nullify the validator keys which are in ψ'o
 * @see (59) - 0.4.5
 */
export const PHI_FN = <T extends ValidatorData[]>(
  validatorKeys: ValidatorData[], // `k` in the graypaper
  p_psi_o: Posterior<IDisputesState["psi_o"]>,
): T => {
  return validatorKeys.map((v) => {
    if (p_psi_o.has(v.ed25519)) {
      return {
        banderSnatch: 0n as BandersnatchKey,
        ed25519: 0n as ValidatorData["ed25519"],
        blsKey: new Uint8Array(144) as ValidatorData["blsKey"],
        metadata: new Uint8Array(128) as ValidatorData["metadata"],
      };
    }
    return v;
  }) as T;
};

/**
 * rotate λ
 * it uses kappa
 * @see (58) - 0.4.5
 */
export const rotateLambdaSTF: STF<
  JamState["lambda"],
  JamState["kappa"],
  never
> = (kappa) => ok([...kappa] as unknown as Posterior<JamState["lambda"]>);

/**
 * rotate k
 * it uses gamma_k
 * @see (58) - 0.4.5
 */
export const rotateKappaSTF: STF<
  JamState["kappa"],
  SafroleState["gamma_k"],
  never
> = (input) => ok([...input] as unknown as Posterior<JamState["kappa"]>);

/**
 * rotate gamma_k
 * @see PHI_FN
 * @see SafroleState["gamma_k"]
 * @see (58) - 0.4.5
 */
export const rotateGammaKSTF: STF<
  SafroleState["gamma_k"],
  { iota: JamState["iota"]; p_psi_o: Posterior<IDisputesState["psi_o"]> },
  never
> = (input) =>
  // we empty the validator keys which are in ψo
  ok(
    PHI_FN(input.iota, input.p_psi_o) as unknown as Posterior<
      SafroleState["gamma_k"]
    >,
  );

/**
 * rotate gamma_z
 * @see SafroleState["gamma_k"]
 * @see (58) - 0.4.5
 */
export const rotateGammaZSTF: STF<
  SafroleState["gamma_z"],
  Posterior<SafroleState["gamma_k"]>,
  never
> = (p_gamma_k) => {
  // gamma_z is the ring root of the posterior gamma
  return ok(Bandersnatch.ringRoot(p_gamma_k.map((v) => v.banderSnatch)));
};

/**
 * rotates all keys
 * @see (58) - 0.4.5
 */
export const rotateKeys: STF<
  [
    JamState["lambda"],
    JamState["kappa"],
    SafroleState["gamma_k"],
    SafroleState["gamma_z"],
  ],
  {
    p_psi_o: Posterior<IDisputesState["psi_o"]>;
    iota: JamState["iota"];
    tau: Tau;
    p_tau: Posterior<Tau>;
  },
  never,
  [
    Posterior<JamState["lambda"]>,
    Posterior<JamState["kappa"]>,
    Posterior<SafroleState["gamma_k"]>,
    Posterior<SafroleState["gamma_z"]>,
  ]
> = ({ p_psi_o, iota, tau, p_tau }, [lambda, kappa, gamma_k, gamma_z]) => {
  if (isNewEra(p_tau, tau)) {
    const f = rotateGammaKSTF({ iota, p_psi_o }, gamma_k).andThen(
      (p_gamma_k) => {
        return Result.combine([
          rotateKappaSTF(gamma_k, kappa),
          rotateLambdaSTF(kappa, lambda),
          rotateGammaZSTF(p_gamma_k, gamma_z),
        ]).map(
          ([p_kappa, p_lambda, p_gamma_z]) =>
            [p_lambda, p_kappa, p_gamma_k, p_gamma_z] as [
              Posterior<JamState["lambda"]>,
              Posterior<JamState["kappa"]>,
              Posterior<SafroleState["gamma_k"]>,
              Posterior<SafroleState["gamma_z"]>,
            ],
        );
      },
    );
    return f;
  }
  return ok([
    toPosterior(lambda),
    toPosterior(kappa),
    toPosterior(gamma_k),
    toPosterior(gamma_z),
  ]);
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  describe("isFallbackMode", () => {
    it("should return true if gamma_s is a series of E Bandersnatch keys", () => {
      const gamma_s = [
        1n as BandersnatchKey,
        2n as BandersnatchKey,
      ] as SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">;
      expect(isFallbackMode(gamma_s)).toBe(true);
    });
    it("should return false if gamma_s is a series of E tickets", () => {
      const gamma_s = [
        { id: 32n as OpaqueHash, attempt: 0 },
        { id: 32n as OpaqueHash, attempt: 1 },
      ] as SeqOfLength<TicketIdentifier, typeof EPOCH_LENGTH, "gamma_s">;
      expect(isFallbackMode(gamma_s)).toBe(false);
    });
  });
}

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;
  const { mockState, mockDisputesState, mockValidatorData } = await import(
    "../test/safroleMocks.js"
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
        });
        const kappa = [mockValidatorData({ ed25519: 2n })] as JamState["kappa"];
        const r = rotateKappaSTF(state.gamma_k, kappa);
        expect(r._unsafeUnwrap).toEqual(state.gamma_k);
      });
      it("should assign k to lambda'", () => {
        const kappa = [mockValidatorData({ ed25519: 2n })] as JamState["kappa"];
        const lambda = [] as ValidatorData[] as JamState["lambda"];
        const r = rotateLambdaSTF(kappa, lambda);

        expect(r._unsafeUnwrap).toEqual(kappa);
      });
      it("should assign iota minus disputes to gamma_k'", () => {
        const state = mockState({});
        const iota = [
          mockValidatorData({ ed25519: 1n }),
          mockValidatorData({ ed25519: 2n }),
        ] as JamState["iota"];
        const p_disputes = mockDisputesState({
          psi_o: new Set([1n]) as unknown as IDisputesState["psi_o"],
        }) as unknown as Posterior<IDisputesState>;
        const r = rotateGammaKSTF(
          {
            iota,
            p_psi_o: p_disputes.psi_o as unknown as Posterior<
              IDisputesState["psi_o"]
            >,
          },
          state.gamma_k,
        );
        expect(r._unsafeUnwrap).toEqual([
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
        const r = rotateGammaZSTF(p_gamma_k, state.gamma_z);
        expect(r._unsafeUnwrap).toEqual(42n);
      });
    });
  });
}
