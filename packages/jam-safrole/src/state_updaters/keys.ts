import { Posterior, toTagged, ValidatorData } from "@vekexasia/jam-types";
import { SafroleState } from "@/index.js";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { IDisputesState } from "@/extrinsics/index.js";
import { isNewEra } from "@/utils.js";
const emptyValidatorKeys: ValidatorData = {
  banderSnatch: toTagged(0n),
  ed25519: toTagged(0n),
  blsKey: 0n as unknown as ValidatorData["blsKey"],
  metadata: new Uint8Array(128) as unknown as ValidatorData["metadata"],
};
/**
 *
 * @see 58 and 59 in the graypaper
 */
export const rotateValidatorKeys = (
  state: SafroleState,
  disputeState: Posterior<IDisputesState>,
): [
  gamma_k: Posterior<SafroleState["gamma_k"]>,
  kappa: Posterior<SafroleState["kappa"]>,
  lambda: Posterior<SafroleState["lambda"]>,
  gamma_z: Posterior<SafroleState["gamma_z"]>,
] => {
  const lambda = state.kappa as unknown as Posterior<SafroleState["lambda"]>;
  const kappa = state.gamma_k as unknown as Posterior<SafroleState["kappa"]>;
  // we empty the validator keys which are in ψo
  const gamma_k = state.iota.map((v) => {
    if (disputeState.psi_o.has(v.ed25519)) {
      return emptyValidatorKeys;
    }
    return v;
  }) as unknown as Posterior<SafroleState["gamma_k"]>;
  // gamma_z is the ring root of the posterior gamma k
  const gamma_z: SafroleState["gamma_z"] = Bandersnatch.ringRoot(
    gamma_k.map((v) => v.banderSnatch),
  );
  return [gamma_k, kappa, lambda, gamma_z];
};

if (import.meta.vitest) {
  const { vi, describe, expect, it } = import.meta.vitest;
  const { mockState, mockDisputesState, mockValidatorData } = await import(
    "../../test/mocks.js"
  );
  type Mock = import("@vitest/spy").Mock;

  // vi.mock("@vekexasia/jam-crypto", () => ({
  //   Bandersnatch: {
  //     ringRoot: vi.fn(),
  //   },
  // }));
  describe("rotateValidatorKeys", () => {
    describe("rotation", () => {
      it("should assign yk to k'", () => {
        const r = rotateValidatorKeys(
          mockState({
            gamma_k: [mockValidatorData({ ed25519: 1n })],
            kappa: [mockValidatorData({ ed25519: 2n })],
            lambda: [mockValidatorData({ ed25519: 3n })],
            gamma_z: 0n as unknown as SafroleState["gamma_z"],
            iota: [mockValidatorData({ ed25519: 1n })],
          }),
          mockDisputesState({}) as Posterior<IDisputesState>,
        );
        // r[1] is kappa'
        expect(r[1]).toEqual([mockValidatorData({ ed25519: 1n })]);
      });
      it("should assign k to lambda'", () => {
        const r = rotateValidatorKeys(
          mockState({
            gamma_k: [mockValidatorData({ ed25519: 1n })],
            kappa: [mockValidatorData({ ed25519: 2n })],
            lambda: [mockValidatorData({ ed25519: 3n })],
            gamma_z: 0n as unknown as SafroleState["gamma_z"],
            iota: [mockValidatorData({ ed25519: 1n })],
          }),
          mockDisputesState({}) as Posterior<IDisputesState>,
        );
        // r[2] is lambda'
        expect(r[2]).toEqual([mockValidatorData({ ed25519: 2n })]);
      });
      it("should assign ringroot (of gamma k ) to gamma_z'", () => {
        (Bandersnatch.ringRoot as Mock).mockReturnValue(42n);
        const r = rotateValidatorKeys(
          mockState({
            gamma_k: [mockValidatorData({ banderSnatch: 1n })],
            kappa: [mockValidatorData({ banderSnatch: 2n })],
            lambda: [mockValidatorData({ banderSnatch: 3n })],
            gamma_z: 0n as unknown as SafroleState["gamma_z"],
            iota: [mockValidatorData({ banderSnatch: 1n })],
          }),
          mockDisputesState({}) as Posterior<IDisputesState>,
        );
        // r[3] is gamma_z'
        expect(r[3]).toEqual(42n);
        expect(Bandersnatch.ringRoot).toHaveBeenCalledWith([1n]);
      });
    });
  });
}
