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
import { isFallbackMode, isNewEra, toPosterior } from "@tsjam/utils";
import { EPOCH_LENGTH } from "@tsjam/constants";
import { ok } from "neverthrow";

/**
 * Phi function
 * returns the validator keys which are not in ψo. nullify the validator keys which are in ψ'o
 * @see $(0.5.0 - 6.14)
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
 * rotates all keys
 * @see (58) - 0.4.5
 * $(0.5.0 - 4.10 / 4.11 / 6.13)
 */
export const rotateKeys: STF<
  [
    SafroleState["gamma_k"],
    JamState["kappa"],
    JamState["lambda"],
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
    Posterior<SafroleState["gamma_k"]>,
    Posterior<JamState["kappa"]>,
    Posterior<JamState["lambda"]>,
    Posterior<SafroleState["gamma_z"]>,
  ]
> = ({ p_psi_o, iota, tau, p_tau }, [gamma_k, kappa, lambda, gamma_z]) => {
  if (isNewEra(p_tau, tau)) {
    const p_gamma_k = PHI_FN(iota, p_psi_o) as unknown as Posterior<
      SafroleState["gamma_k"]
    >;
    const p_kappa = [...gamma_k] as Posterior<JamState["kappa"]>;
    const p_lambda = [...kappa] as Posterior<JamState["lambda"]>;
    const p_gamma_z = Bandersnatch.ringRoot(
      p_gamma_k.map((v) => v.banderSnatch),
    ) as Posterior<SafroleState["gamma_z"]>;

    return ok(toPosterior([p_gamma_k, p_kappa, p_lambda, p_gamma_z]));
  }
  return ok(
    toPosterior([
      toPosterior(gamma_k),
      toPosterior(kappa),
      toPosterior(lambda),
      toPosterior(gamma_z),
    ]),
  );
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
