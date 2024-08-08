import { TicketExtrinsics } from "@/extrinsics/tickets/extrinsic.js";
import {
  BandersnatchKey,
  JAM_VALID,
  MAX_TICKETS_PER_BLOCK,
  Posterior,
} from "@vekexasia/jam-types";
import assert from "node:assert";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import { SafroleState } from "@/index.js";
import { bigintToBytes } from "@vekexasia/jam-codec";
import { computeTicketIdentifiers } from "@/extrinsics/tickets/gammaA.js";

export const validateTicketExtrinsic = (
  extrinsic: TicketExtrinsics,
  state: SafroleState,
  p_state: Posterior<SafroleState>,
) => {
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
  // TODO: Validate RingVRFProof
  for (const ext of extrinsic) {
    // (74)
    assert(
      Bandersnatch.verifyVrfProof(
        ext.proof,
        state.gamma_z,
        new Uint8Array([
          ...JAM_VALID,
          ...bigintToBytes(p_state.eta[2], 32),
          ext.entryIndex,
        ]),
      ),
      "Invalid VRF proof",
    );
  }

  const n = computeTicketIdentifiers(extrinsic);
  n.reduce((prev, cur) => {
    // (77)
    assert(
      prev.id < cur.id,
      "VRF outputs must be in ascending order and not duplicate",
    );
    return cur;
  });

  // (78) make sure that the y terms are not already in gamma_a
  const gammaids = state.gamma_a.map((x) => x.id);
  // TODO this can be otpimized as gamma_a is sorted as per (79)
  for (const x of n) {
    assert(!gammaids.includes(x.id), "Ticket id already in gamma_a");
  }
};
