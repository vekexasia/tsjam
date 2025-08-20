import {
  BaseJamCodecable,
  binaryCodec,
  BufferJSONCodec,
  encodeWithCodec,
  eSubIntCodec,
  fixedSizeIdentityCodec,
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
import type {
  Posterior,
  RingVRFProof,
  TicketsExtrinsic,
  TicketsExtrinsicElement,
  UpToSeq,
  Validated,
} from "@tsjam/types";
import { err, ok, Result } from "neverthrow";
import type { GammaAImpl } from "../gamma-a-impl";
import type { JamEntropyImpl } from "../jam-entropy-impl";
import type { SafroleStateImpl } from "../safrole-state-impl";
import { TicketImpl } from "../ticket-impl";
import type { GammaZImpl } from "../gamma-z-impl";
import type { TauImpl } from "../slot-impl";
import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet } from "@/data-structures/identity-set";
import { compareUint8Arrays } from "uint8array-extras";
import { toTagged } from "@tsjam/utils";

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

  /**
   * $(0.7.1 - 6.29) | we validate the ticket
   */
  checkValidity(deps: {
    p_gamma_z: Posterior<GammaZImpl>;
    p_entropy: Posterior<JamEntropyImpl>;
  }): Result<Validated<TicketsExtrinsicElementImpl>, ETError> {
    if (this.attempt < 0 || this.attempt >= MAX_TICKETS_PER_VALIDATOR) {
      return err(ETError.INVALID_ENTRY_INDEX);
    }
    const sig = Bandersnatch.verifyVrfProof(
      this.proof,
      deps.p_gamma_z.root,
      new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...encodeWithCodec(HashCodec, deps.p_entropy._2),
        this.attempt,
      ]),
    );
    if (!sig) {
      return err(ETError.INVALID_VRF_PROOF);
    }
    return ok(toTagged(this));
  }
}

/**
 * $(0.7.1 - 6.29)
 * $(0.7.1 - C.17) | codec
 */
@JamCodecable()
export class TicketsExtrinsicImpl
  extends BaseJamCodecable
  implements TicketsExtrinsic
{
  @lengthDiscriminatedCodec(TicketsExtrinsicElementImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<TicketsExtrinsicElementImpl, typeof MAX_TICKETS_PER_BLOCK>;

  constructor(elements: TicketsExtrinsicElementImpl[] = []) {
    super();
    this.elements = toTagged(elements);
  }

  newTickets(deps: {
    p_tau: Validated<Posterior<TauImpl>>;
    p_gamma_z: Posterior<SafroleStateImpl["gamma_z"]>;
    gamma_a: GammaAImpl;
    p_entropy: Posterior<JamEntropyImpl>;
  }): Result<TicketImpl[], ETError> {
    if (this.elements.length === 0) {
      return ok([]); // optimization
    }

    // $(0.7.1 - 6.30) | first case
    // NOTE: the length 0 is handled above
    if (deps.p_tau.slotPhase() >= LOTTERY_MAX_SLOT) {
      return err(ETError.LOTTERY_ENDED);
    }

    // $(0.7.1 - 6.30) | first case
    if (this.elements.length > MAX_TICKETS_PER_BLOCK) {
      return err(ETError.MAX_TICKETS_EXCEEDED);
    }

    for (const extrinsic of this.elements) {
      const [e] = extrinsic
        .checkValidity({
          p_entropy: deps.p_entropy,
          p_gamma_z: deps.p_gamma_z,
        })
        .safeRet();
      if (typeof e !== "undefined") {
        return err(e);
      }
    }

    // $(0.7.1 - 6.31)
    const n: TicketImpl[] = [];
    for (const x of this.elements) {
      n.push(
        new TicketImpl({
          id: Bandersnatch.vrfOutputRingProof(x.proof), // y
          attempt: x.attempt, // r
        }),
      );
    }

    // $(0.7.1 - 6.32) | tickets should be in order and unique
    for (let i = 1; i < n.length; i++) {
      if (compareUint8Arrays(n[i - 1].id, n[i].id) >= 0) {
        return err(ETError.UNSORTED_VRF_PROOFS);
      }
    }

    // $(0.7.1 - 6.33) | make sure ticket were not submitted already
    const gamma_a_ids = new IdentitySet(deps.gamma_a.elements.map((x) => x.id));
    for (const x of n) {
      if (gamma_a_ids.has(x.id)) {
        return err(ETError.TICKET_IN_GAMMA_A);
      }
    }

    return ok(n);
  }

  static newEmpty(): TicketsExtrinsicImpl {
    return new TicketsExtrinsicImpl([]);
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("TicketsExtrinsicImpl", () => {
    it("tickets_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("tickets_extrinsic.bin");
      const { value: eg } = TicketsExtrinsicImpl.decode(bin);
      expect(Buffer.from(eg.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
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
