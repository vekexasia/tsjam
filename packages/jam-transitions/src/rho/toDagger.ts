import { Dagger, Hash, RHO } from "@vekexasia/jam-types";
import assert from "node:assert";
import { newSTF, toDagger, toTagged } from "@vekexasia/jam-utils";

/**
 * Input should be the newly added hashes to phi_b and phi_w
 */
export const RHO_2_Dagger = newSTF<RHO, Set<Hash>, Dagger<RHO>>({
  assertInputValid(input: Set<Hash>, curState: RHO) {
    const hashes = new Set<Hash>(
      curState
        .filter((a) => a !== null)
        .map((a) => {
          return a!.workReport.workPackageSpecification.workPackageHash;
        }),
    );
    const allPresent = [...input].every((a) => hashes.has(a));
    assert(allPresent, "All reports must be present in the rho");
  },
  assertPStateValid() {},
  apply(input: Set<Hash>, curState: RHO): Dagger<RHO> {
    // (111) in the greypaper
    const rho_dagger: RHO = toTagged(
      curState.map((a) => {
        if (a === null) {
          return null;
        }
        if (input.has(a.workReport.workPackageSpecification.workPackageHash)) {
          return null;
        }
        return a;
      }),
    );
    return toDagger(rho_dagger);
  },
});
