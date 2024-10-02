import {
  Dagger,
  Hash,
  IDisputesState,
  Posterior,
  RHO,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { newSTF, toDagger, toTagged } from "@vekexasia/jam-utils";

/**
 * Input should be the newly added hashes to phi_b and phi_w
 * (110)
 *
 */
export const RHO_2_Dagger = newSTF<RHO, Posterior<IDisputesState>, Dagger<RHO>>(
  {
    assertInputValid(input: Posterior<IDisputesState>, curState: RHO) {
      const hashes = new Set<Hash>(
        curState
          .filter((a) => a !== null)
          .map((a) => {
            return a!.workReport.workPackageSpecification.workPackageHash;
          }),
      );
      const allPresent = [...input.psi_b, ...input.psi_w].every((a) =>
        hashes.has(a),
      );
      assert(allPresent, "All reports must be present in the rho");
    },
    assertPStateValid() {},
    apply(input: Posterior<IDisputesState>, curState: RHO): Dagger<RHO> {
      const sets = new Set([...input.psi_b, ...input.psi_w]);
      const rho_dagger: RHO = toTagged(
        curState.map((a) => {
          if (a === null) {
            return null;
          }
          if (sets.has(a.workReport.workPackageSpecification.workPackageHash)) {
            return null;
          }
          return a;
        }),
      );
      return toDagger(rho_dagger);
    },
  },
);
