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
} from "@tsjam/constants";
import { Bandersnatch } from "@tsjam/crypto";
import { Result, err, ok } from "neverthrow";

export enum ETError {
  LOTTERY_ENDED = "Lottery has ended",
  INVALID_ENTRY_INDEX = "Entry index must be 0 or 1",
  INVALID_VRF_PROOF = "Invalid VRF proof",
  MAX_TICKETS_EXCEEDED = "Extrinsic length must be less than MAX_TICKETS_PER_BLOCK",
  TICKET_IN_GAMMA_A = "Ticket id already in gamma_a",
  UNSORTED_VRF_PROOFS = "VRF outputs must be in ascending order and not duplicate",
}

/**
 * handles Et
 * @see (75) - 0.4.5
 */
export const etToIdentifiers = (
  et: TicketExtrinsics,
  input: {
    p_tau: Posterior<Tau>;
    gamma_z: SafroleState["gamma_z"];
    gamma_a: SafroleState["gamma_a"];
    p_entropy: Posterior<JamState["entropy"]>;
  },
): Result<TicketIdentifier[], ETError> => {
  if (et.length === 0) {
    return ok([]); // optimization
  }

  // (75) first case
  if (slotIndex(input.p_tau) >= LOTTERY_MAX_SLOT) {
    return err(ETError.LOTTERY_ENDED);
  }

  // (75) first case
  if (et.length > MAX_TICKETS_PER_BLOCK) {
    return err(ETError.MAX_TICKETS_EXCEEDED);
  }

  // (74)
  for (const extrinsic of et) {
    if (extrinsic.entryIndex !== 0 && extrinsic.entryIndex !== 1) {
      return err(ETError.INVALID_ENTRY_INDEX);
    }
    const sig = Bandersnatch.verifyVrfProof(
      extrinsic.proof,
      input.gamma_z,
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

  const n: TicketIdentifier[] = [];
  for (const x of et) {
    // (76)
    n.push({
      id: Bandersnatch.vrfOutputRingProof(x.proof), // y
      attempt: x.entryIndex, // r
    });
  }

  // (78) make sure that the y terms are not already in gamma_a
  const gamma_a_ids = new Set(input.gamma_a.map((x) => x.id));
  for (const x of n) {
    if (gamma_a_ids.has(x.id)) {
      return err(ETError.TICKET_IN_GAMMA_A);
    }
  }

  for (let i = 1; i < n.length; i++) {
    // (77)
    if (n[i - 1].id >= n[i].id) {
      return err(ETError.UNSORTED_VRF_PROOFS);
    }
  }

  return ok(n);
  // we need to check (80) as well but that is in gamma_aSTF
  // as it would be acircular dependency to have p_gamma_a as input here
};
