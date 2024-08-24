import { TicketExtrinsics } from "@/extrinsics/tickets/extrinsic.js";
import {
  JAM_TICKET_SEAL,
  JAM_VALID,
  MAX_TICKETS_PER_BLOCK,
  Posterior,
  TicketIdentifier,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { SafroleState } from "@/index.js";
import { bigintToBytes } from "@vekexasia/jam-codec";

export const validateTicketExtrinsic = (
  extrinsic: TicketExtrinsics,
  ticketIdentifiers: TicketIdentifier[], // computed with computeTicketIdentifiers
  state: SafroleState,
  p_eta: Posterior<SafroleState["eta"]>,
  p_gamma_a: Posterior<SafroleState["gamma_a"]>,
) => {
  if (extrinsic.length === 0) {
    return; // optimization
  }
  // (75)
  assert(
    extrinsic.length <= MAX_TICKETS_PER_BLOCK,
    "Extrinsic length must be less than 16",
  );

  for (const ext of extrinsic) {
    assert(
      ext.entryIndex === 0 || ext.entryIndex === 1,
      "Entry index must be 0 or 1",
    );
  }

  for (const ext of extrinsic) {
    // (74)
    assert(
      Bandersnatch.verifyVrfProof(
        ext.proof,
        state.gamma_z,
        new Uint8Array([
          ...JAM_TICKET_SEAL,
          ...bigintToBytes(p_eta[2], 32),
          ext.entryIndex,
        ]),
      ),
      "Invalid VRF proof",
    );
  }

  ticketIdentifiers.reduce((prev, cur) => {
    // (77)
    assert(
      prev.id < cur.id,
      "VRF outputs must be in ascending order and not duplicate",
    );
    return cur;
  });

  // (78) make sure that the y terms are not already in gamma_a
  const gamma_a_ids = state.gamma_a.map((x) => x.id);
  // TODO this can be otpimized as gamma_a is sorted as per (79)
  for (const x of ticketIdentifiers) {
    assert(!gamma_a_ids.includes(x.id), "Ticket id already in gamma_a");
  }

  // we need to checj (80) so that the extrinsic does not contain any ticket that would not end up
  // in posterior gamma_a
  const p_gamma_a_ids = p_gamma_a.map((x) => x.id);

  for (const x of ticketIdentifiers) {
    assert(p_gamma_a_ids.includes(x.id), "Ticket not in posterior gamma_a");
  }
};
