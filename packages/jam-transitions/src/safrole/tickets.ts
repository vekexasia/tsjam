import { bigintToBytes, slotIndex } from "@tsjam/utils";
import {
  JamState,
  Posterior,
  SafroleState,
  Tau,
  TicketExtrinsics,
  TicketIdentifier,
} from "@tsjam/types";
import {
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
  MAX_TICKETS_PER_BLOCK,
  MAX_TICKETS_PER_VALIDATOR,
} from "@tsjam/constants";
import { Bandersnatch } from "@tsjam/crypto";
import { Result, err, ok } from "neverthrow";

export enum ETError {
  LOTTERY_ENDED = "Lottery has ended",
  INVALID_ENTRY_INDEX = "Invalid Entry index must be 0<=x<N",
  INVALID_VRF_PROOF = "Invalid VRF proof",
  MAX_TICKETS_EXCEEDED = "Extrinsic length must be less than MAX_TICKETS_PER_BLOCK",
  TICKET_IN_GAMMA_A = "Ticket id already in gamma_a",
  UNSORTED_VRF_PROOFS = "VRF outputs must be in ascending order and not duplicate",
}

/**
 * handles Et
 */
export const etToIdentifiers = (
  et: TicketExtrinsics,
  input: {
    p_tau: Posterior<Tau>;
    p_gamma_z: Posterior<SafroleState["gamma_z"]>;
    gamma_a: SafroleState["gamma_a"];
    p_entropy: Posterior<JamState["entropy"]>;
  },
): Result<TicketIdentifier[], ETError> => {
  if (et.length === 0) {
    return ok([]); // optimization
  }

  // $(0.6.4 - 6.30) | first case
  if (slotIndex(input.p_tau) >= LOTTERY_MAX_SLOT) {
    return err(ETError.LOTTERY_ENDED);
  }

  // $(0.6.4 - 6.30) | first case
  if (et.length > MAX_TICKETS_PER_BLOCK) {
    return err(ETError.MAX_TICKETS_EXCEEDED);
  }

  // $(0.6.5 - 6.29) | we validate the ticket
  for (const extrinsic of et) {
    if (
      extrinsic.entryIndex < 0 ||
      extrinsic.entryIndex >= MAX_TICKETS_PER_VALIDATOR
    ) {
      return err(ETError.INVALID_ENTRY_INDEX);
    }
    const sig = Bandersnatch.verifyVrfProof(
      extrinsic.proof,
      input.p_gamma_z,
      new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...bigintToBytes(input.p_entropy[2], 32),
        extrinsic.entryIndex,
      ]),
    );
    if (!sig) {
      return err(ETError.INVALID_VRF_PROOF);
    }
  }

  // $(0.6.4 - 6.31)
  const n: TicketIdentifier[] = [];
  for (const x of et) {
    n.push({
      id: Bandersnatch.vrfOutputRingProof(x.proof), // y
      attempt: x.entryIndex, // r
    });
  }

  // $(0.6.4 - 6.32) | tickets should be in order and unique
  for (let i = 1; i < n.length; i++) {
    if (n[i - 1].id >= n[i].id) {
      return err(ETError.UNSORTED_VRF_PROOFS);
    }
  }

  // $(0.6.4 - 6.33) | make sure ticket were not submitted already
  const gamma_a_ids = new Set(input.gamma_a.map((x) => x.id));
  for (const x of n) {
    if (gamma_a_ids.has(x.id)) {
      return err(ETError.TICKET_IN_GAMMA_A);
    }
  }

  return ok(n);
};
