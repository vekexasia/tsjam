import { encodeWithCodec, WorkReportCodec } from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import { Dagger, IDisputesState, Posterior, RHO, STF } from "@tsjam/types";
import { toDagger, toTagged } from "@tsjam/utils";
import { ok } from "neverthrow";

export enum RHO_2_DaggerError {
  MISSING_REPORT = "All reports must be present in the rho",
}
/**
 * Input should be the newly added hashes to phi_b and phi_w
 * $(0.7.0 - 10.15)
 */
export const RHO_2_Dagger: STF<
  RHO,
  Posterior<IDisputesState>,
  RHO_2_DaggerError,
  Dagger<RHO>
> = (input, curState) => {
  // NOTE: Andrea this is correct bad contains votes = 0 and wonky < 2/3+1
  // it does change from gp but we assume that if it was already present then
  // rho would have it cleared for the core
  // so this is basically doing the t < 2/3V check
  const sets = new Set([...input.bad, ...input.wonky]);
  const rho_dagger: RHO = toTagged(
    curState.map((rho_c) => {
      if (typeof rho_c === "undefined") {
        return undefined;
      }
      const hash = Hashing.blake2b(
        encodeWithCodec(WorkReportCodec, rho_c.workReport),
      );

      // Compute report hash
      if (sets.has(hash)) {
        return undefined;
      }
      return rho_c;
    }),
  );
  return ok(toDagger(rho_dagger));
};
