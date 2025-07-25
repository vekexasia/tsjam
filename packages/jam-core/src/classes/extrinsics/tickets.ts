import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  encodeWithCodec,
  eSubIntCodec,
  fixedSizeIdentityCodec,
  HashCodec,
  JamCodecable,
  jsonCodec,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import {
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
  MAX_TICKETS_PER_BLOCK,
  MAX_TICKETS_PER_VALIDATOR,
} from "@tsjam/constants";
import { Bandersnatch } from "@tsjam/crypto";
import {
  Posterior,
  RingVRFProof,
  Tau,
  TicketsExtrinsic,
  TicketsExtrinsicElement,
  UpToSeq,
} from "@tsjam/types";
import { slotIndex } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { GammaAImpl } from "../GammaAImpl";
import { JamEntropyImpl } from "../JamEntropyImpl";
import { SafroleStateImpl } from "../SafroleStateImpl";
import { TicketImpl } from "../TicketImpl";

export enum ETError {
  LOTTERY_ENDED = "Lottery has ended",
  INVALID_ENTRY_INDEX = "Invalid Entry index must be 0<=x<N",
  INVALID_VRF_PROOF = "Invalid VRF proof",
  MAX_TICKETS_EXCEEDED = "Extrinsic length must be less than MAX_TICKETS_PER_BLOCK",
  TICKET_IN_GAMMA_A = "Ticket id already in gamma_a",
  UNSORTED_VRF_PROOFS = "VRF outputs must be in ascending order and not duplicate",
}

@JamCodecable()
export class TicketsExtrinsicElementImpl
  extends BaseJamCodecable
  implements TicketsExtrinsicElement
{
  /**
   * `r`
   */
  @eSubIntCodec(1)
  attempt!: 0 | 1;
  /**
   * `p`
   */
  @jsonCodec(BufferJSONCodec(), "signature")
  @binaryCodec(fixedSizeIdentityCodec(784))
  proof!: RingVRFProof;
}

@JamCodecable()
export class TicketsExtrinsicImpl
  extends BaseJamCodecable
  implements TicketsExtrinsic
{
  @lengthDiscriminatedCodec(TicketsExtrinsicElementImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<TicketsExtrinsicElementImpl, 16>;

  newTickets(deps: {
    p_tau: Posterior<Tau>;
    p_gamma_z: Posterior<SafroleStateImpl["gamma_z"]>;
    gamma_a: GammaAImpl;
    p_entropy: Posterior<JamEntropyImpl>;
  }): Result<TicketImpl[], ETError> {
    if (this.elements.length === 0) {
      return ok([]); // optimization
    }

    // $(0.7.0 - 6.30) | first case
    // NOTE: the length 0 is handled above
    if (slotIndex(deps.p_tau) >= LOTTERY_MAX_SLOT) {
      return err(ETError.LOTTERY_ENDED);
    }

    // $(0.7.0 - 6.30) | first case
    if (this.elements.length > MAX_TICKETS_PER_BLOCK) {
      return err(ETError.MAX_TICKETS_EXCEEDED);
    }

    // $(0.7.0 - 6.29) | we validate the ticket
    for (const extrinsic of this.elements) {
      if (
        extrinsic.attempt < 0 ||
        extrinsic.attempt >= MAX_TICKETS_PER_VALIDATOR
      ) {
        return err(ETError.INVALID_ENTRY_INDEX);
      }
      const sig = Bandersnatch.verifyVrfProof(
        extrinsic.proof,
        deps.p_gamma_z.root,
        new Uint8Array([
          ...JAM_TICKET_SEAL,
          ...encodeWithCodec(HashCodec, deps.p_entropy._2),
          extrinsic.attempt,
        ]),
      );
      if (!sig) {
        return err(ETError.INVALID_VRF_PROOF);
      }
    }

    // $(0.7.0 - 6.31)
    const n: TicketImpl[] = [];
    for (const x of this.elements) {
      n.push(
        new TicketImpl({
          id: Bandersnatch.vrfOutputRingProof(x.proof), // y
          attempt: x.attempt, // r
        }),
      );
    }

    // $(0.6.4 - 6.32) | tickets should be in order and unique
    for (let i = 1; i < n.length; i++) {
      if (n[i - 1].id >= n[i].id) {
        return err(ETError.UNSORTED_VRF_PROOFS);
      }
    }

    // $(0.6.4 - 6.33) | make sure ticket were not submitted already
    const gamma_a_ids = new Set(deps.gamma_a.elements.map((x) => x.id));
    for (const x of n) {
      if (gamma_a_ids.has(x.id)) {
        return err(ETError.TICKET_IN_GAMMA_A);
      }
    }

    return ok(n);
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
  describe("TicketsExtrinsicImpl", () => {
    it("tickets_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("tickets_extrinsic.bin");
      const { value: eg } = TicketsExtrinsicImpl.decode(bin);
      expect(Buffer.from(eg.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
      console.log(eg.toJSON());
    });
    it("tickets_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("tickets_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const eg: TicketsExtrinsicImpl = TicketsExtrinsicImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
