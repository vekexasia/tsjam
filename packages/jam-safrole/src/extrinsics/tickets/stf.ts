// compute `n` (76)
import { TicketExtrinsics } from "@/extrinsics/index.js";
import {
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
  MAX_TICKETS_PER_BLOCK,
  Posterior,
  TicketIdentifier,
  newSTF,
} from "@vekexasia/jam-types";
import { Bandersnatch } from "@vekexasia/jam-crypto";
import assert from "node:assert";
import { TauTransition } from "@/state_updaters/types.js";
import { slotIndex } from "@/utils.js";
import { bigintToBytes } from "@vekexasia/jam-codec";
import { SafroleState } from "@/index.js";

export const ticketExtrinsicToIdentifiersSTF = newSTF<
  null,
  {
    extrinsic: TicketExtrinsics;
    nextTau: TauTransition["nextTau"];
    gamma_z: SafroleState["gamma_z"];
    gamma_a: SafroleState["gamma_a"];
    p_eta: Posterior<SafroleState["eta"]>;
  },
  TicketIdentifier[]
>({
  assertInputValid(input): void {
    if (input.extrinsic.length === 0) {
      return; // optimization
    }

    // (75) first case
    if (slotIndex(input.nextTau) >= LOTTERY_MAX_SLOT) {
      throw new Error("Lottery has ended");
    }

    // (75) second case
    assert(
      input.extrinsic.length <= MAX_TICKETS_PER_BLOCK,
      "Extrinsic length must be less than MAX_TICKETS_PER_BLOCK",
    );

    for (const ext of input.extrinsic) {
      assert(
        ext.entryIndex === 0 || ext.entryIndex === 1,
        "Entry index must be 0 or 1",
      );
    }

    for (const ext of input.extrinsic) {
      // (74)
      assert(
        Bandersnatch.verifyVrfProof(
          ext.proof,
          input.gamma_z,
          new Uint8Array([
            ...JAM_TICKET_SEAL,
            ...bigintToBytes(input.p_eta[2], 32),
            ext.entryIndex,
          ]),
        ),
        "Invalid VRF proof",
      );
    }
  },
  assertPStateValid(input, p_state: TicketIdentifier[]) {
    if (p_state.length === 0) {
      return; // optimization
    }
    // (78) make sure that the y terms are not already in gamma_a
    const gamma_a_ids = input.gamma_a.map((x) => x.id);
    // TODO this can be otpimized as gamma_a is sorted as per (79)
    for (const x of p_state) {
      assert(!gamma_a_ids.includes(x.id), "Ticket id already in gamma_a");
    }

    p_state.reduce((prev, cur) => {
      // (77)
      assert(
        prev.id < cur.id,
        "VRF outputs must be in ascending order and not duplicate",
      );
      return cur;
    });
    // we need to check (80) as well but that is in gamma_aSTF
    // as it would be acircular dependency to have p_gamma_a as input here
  },
  apply(input) {
    const n: TicketIdentifier[] = [];
    for (const x of input.extrinsic) {
      // (76)
      n.push({
        id: Bandersnatch.vrfOutputRingProof(x.proof),
        attempt: x.entryIndex,
      });
    }
    return n;
  },
});
