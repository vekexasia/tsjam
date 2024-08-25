import {
  ED25519PublicKey,
  Hash,
  NUMBER_OF_VALIDATORS,
  Posterior,
} from "@vekexasia/jam-types";
import {
  assertDisputeExtrinsicValid,
  DisputeExtrinsic,
} from "@/extrinsics/index.js";
import { Ed25519 } from "@vekexasia/jam-crypto";
import { SafroleState } from "@/index.js";

/**
 * Section 10 of graypaper
 */
export interface IDisputesState {
  /**
   * the set of hash of work reports
   * that were judged to be **valid**.
   */
  psi_g: Set<Hash>;

  /**
   * the set of hash of work reports
   * that were judged to be **bad.**
   * bad means that the extrinsic had a verdict with 2/3+1 validators saying the validity was 0
   */
  psi_b: Set<Hash>;

  /**
   * set of work reports judged to be wonky or impossible to judge
   */
  psi_w: Set<Hash>;
  /**
   * set of validator keys found to have misjudged a work report
   * aka: they voted for a work report to be valid when it was not (in psi_b) or vice versa
   */
  psi_o: Set<ED25519PublicKey>;
}

export const DisputeState: IDisputesState = {
  psi_g: new Set(),
  psi_b: new Set(),
  psi_w: new Set(),
  psi_o: new Set(),
};

export const disputesSTF = (
  safroleState: SafroleState,
  state: IDisputesState,
  extrinsic: DisputeExtrinsic,
): Posterior<IDisputesState> => {
  const V = assertDisputeExtrinsicValid(safroleState, extrinsic, state);

  const newState = {
    // (112) of the graypaper
    psi_g: new Set([
      ...state.psi_g,
      ...V.filter(
        ({ votes }) => votes == (NUMBER_OF_VALIDATORS * 2) / 3 + 1,
      ).map(({ reportHash }) => reportHash),
    ]),
    // (113) of the graypaper
    psi_b: new Set([
      ...state.psi_b,
      ...V.filter(({ votes }) => votes == 0).map(
        ({ reportHash }) => reportHash,
      ),
    ]),
    // (114) of the graypaper
    psi_w: new Set([
      ...state.psi_w,
      ...V.filter(({ votes }) => votes == NUMBER_OF_VALIDATORS / 3).map(
        ({ reportHash }) => reportHash,
      ),
    ]),

    // (115) of the graypaper
    psi_o: new Set([
      ...state.psi_o,
      ...extrinsic.culprit.map(({ ed25519PublicKey }) => ed25519PublicKey),
      ...extrinsic.faults.map(({ ed25519PublicKey }) => ed25519PublicKey),
    ]),
  } as Posterior<IDisputesState>;

  // perform some other last checks
  // (102) of the graypaper states that faults reports should be in psi_b' if `r`
  extrinsic.faults.forEach(({ hash, validity, ed25519PublicKey }) => {
    if (validity == 1) {
      if (
        !(newState.psi_b.has(hash) && !newState.psi_o.has(ed25519PublicKey))
      ) {
        throw new Error(
          "with fault validity 1, the report must be in psi_b' and not in psi_o'",
        );
      }
    } else {
      if (
        !(!newState.psi_b.has(hash) && newState.psi_o.has(ed25519PublicKey))
      ) {
        throw new Error(
          "with fault validity 0, the report must NOT be in psi_b' and in psi_o'",
        );
      }
    }
  });

  // (101) of the graypaper culrpit reports should be in psi_b'
  extrinsic.culprit.forEach(({ hash }) => {
    if (!newState.psi_b.has(hash)) {
      throw new Error("culprit must be in psi_b'");
    }
  });
  return newState;
};
