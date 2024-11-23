import {
  Dagger,
  Hash,
  IDisputesState,
  Posterior,
  RHO,
  STF,
} from "@tsjam/types";
import { toDagger, toTagged } from "@tsjam/utils";
import { err, ok } from "neverthrow";

export enum RHO_2_DaggerError {
  MISSING_REPORT = "All reports must be present in the rho",
}
/**
 * Input should be the newly added hashes to phi_b and phi_w
 * (110)
 *
 */
export const RHO_2_Dagger: STF<
  RHO,
  Posterior<IDisputesState>,
  RHO_2_DaggerError,
  Dagger<RHO>
> = (input, curState) => {
  const hashes = new Set<Hash>(
    curState
      .filter((a) => typeof a !== "undefined")
      .map((a) => {
        return a!.workReport.workPackageSpecification.workPackageHash;
      }),
  );
  const allPresent = [...input.psi_b, ...input.psi_w].every((a) =>
    hashes.has(a),
  );
  if (!allPresent) {
    return err(RHO_2_DaggerError.MISSING_REPORT);
  }
  const sets = new Set([...input.psi_b, ...input.psi_w]);
  const rho_dagger: RHO = toTagged(
    curState.map((a) => {
      if (typeof a === "undefined") {
        return undefined;
      }
      if (sets.has(a.workReport.workPackageSpecification.workPackageHash)) {
        return undefined;
      }
      return a;
    }),
  );
  return ok(toDagger(rho_dagger));
};
