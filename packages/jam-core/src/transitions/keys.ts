import { EPOCH_LENGTH } from "@tsjam/constants";
import { Bandersnatch } from "@tsjam/crypto";
import {
  BandersnatchKey,
  Hash,
  IDisputesState,
  JamState,
  Posterior,
  STF,
  SafroleState,
  SeqOfLength,
  Tau,
  Ticket,
  ValidatorData,
} from "@tsjam/types";
import { isFallbackMode, isNewEra, toPosterior, toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";

/**
 * Phi function
 * returns the validator keys which are not in ψo. nullify the validator keys which are in ψ'o
 * @see $(0.6.4 - 6.14)
 */
export const PHI_FN = <T extends ValidatorData[]>(
  validatorKeys: ValidatorData[], // `k` in the graypaper
  p_offenders: Posterior<IDisputesState["offenders"]>,
): T => {
  return validatorKeys.map((v) => {
    if (p_offenders.has(v.ed25519.bigint)) {
      return {
        banderSnatch: new Uint8Array(32).fill(0) as BandersnatchKey,
        ed25519: {
          buf: new Uint8Array(32).fill(0) as ValidatorData["ed25519"]["buf"],
          bigint: toTagged(0n),
        },
        blsKey: new Uint8Array(144).fill(0) as ValidatorData["blsKey"],
        metadata: new Uint8Array(128).fill(0) as ValidatorData["metadata"],
      };
    }
    return v;
  }) as T;
};

/**
 * rotates all keys
 * $(0.7.0 - 4.9 / 4.10 / 6.13)
 */
export const rotateKeys: STF<
  [
    SafroleState["gamma_p"],
    JamState["kappa"],
    JamState["lambda"],
    SafroleState["gamma_z"],
  ],
  {
    p_offenders: Posterior<IDisputesState["offenders"]>;
    iota: JamState["iota"];
    tau: Tau;
    p_tau: Posterior<Tau>;
  },
  never,
  [
    Posterior<SafroleState["gamma_p"]>,
    Posterior<JamState["kappa"]>,
    Posterior<JamState["lambda"]>,
    Posterior<SafroleState["gamma_z"]>,
  ]
> = ({ p_offenders, iota, tau, p_tau }, [gamma_p, kappa, lambda, gamma_z]) => {
  if (isNewEra(p_tau, tau)) {
    const p_gamma_k = PHI_FN(iota, p_offenders) as unknown as Posterior<
      SafroleState["gamma_p"]
    >;
    const p_kappa = [...gamma_p] as Posterior<JamState["kappa"]>;
    const p_lambda = [...kappa] as Posterior<JamState["lambda"]>;
    const p_gamma_z = Bandersnatch.ringRoot(
      p_gamma_k.map((v) => v.banderSnatch),
    ) as Posterior<SafroleState["gamma_z"]>;

    return ok(toPosterior([p_gamma_k, p_kappa, p_lambda, p_gamma_z]));
  }
  return ok(
    toPosterior([
      toPosterior(gamma_p),
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
        toTagged(Buffer.alloc(32).fill(0)) as BandersnatchKey,
        toTagged(Buffer.alloc(32).fill(0)) as BandersnatchKey,
      ] as SeqOfLength<BandersnatchKey, typeof EPOCH_LENGTH, "gamma_s">;
      expect(isFallbackMode(gamma_s)).toBe(true);
    });
    it("should return false if gamma_s is a series of E tickets", () => {
      const gamma_s = [
        { id: 32n as Hash, attempt: 0 },
        { id: 32n as Hash, attempt: 1 },
      ] as SeqOfLength<Ticket, typeof EPOCH_LENGTH, "gamma_s">;
      expect(isFallbackMode(gamma_s)).toBe(false);
    });
  });
}
