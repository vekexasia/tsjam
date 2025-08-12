import { outsideInSequencer } from "@/utils";
import { codec, encodeWithCodec, JamCodecable } from "@tsjam/codec";
import {
  EPOCH_LENGTH,
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
} from "@tsjam/constants";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import {
  BandersnatchSignature,
  HeaderHash,
  Posterior,
  SeqOfLength,
  SignedJamHeader,
  ValidatorIndex,
} from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { compareUint8Arrays } from "uint8array-extras";
import { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import { JamStateImpl } from "./jam-state-impl";
import { SafroleStateImpl } from "./safrole-state-impl";
import { TicketImpl } from "./ticket-impl";
import { JamHeaderImpl } from "./jam-header-impl";
import { HashCodec, xBytesCodec } from "@/codecs/misc-codecs";
import { IdentitySet } from "@/data-structures/identity-set";

/**
 * $(0.7.1 - C.22) | codec
 */
@JamCodecable()
export class JamSignedHeaderImpl
  extends JamHeaderImpl
  implements SignedJamHeader
{
  @codec(xBytesCodec(96))
  seal!: BandersnatchSignature;

  constructor(
    config?: Partial<ConditionalExcept<JamSignedHeaderImpl, Function>>,
  ) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  signedHash(): HeaderHash {
    return Hashing.blake2b(this.toBinary());
  }

  public sealSignContext(state: Posterior<JamStateImpl>): Uint8Array {
    if (state.safroleState.gamma_s.isFallback()) {
      return new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...encodeWithCodec(HashCodec, state.entropy._3),
      ]);
    } else {
      const i = state.safroleState.gamma_s.tickets![this.slot.slotPhase()];
      return new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...encodeWithCodec(HashCodec, state.entropy._3),
        i.attempt,
      ]);
    }
  }

  /**
   * $(0.7.1 - 5.9)
   */
  blockAuthor(p_kappa: Posterior<JamStateImpl["kappa"]>) {
    return p_kappa.at(this.authorIndex)!.banderSnatch;
  }

  /**
   * Verify Hs
   * $(0.7.1 - 6.18 / 6.19 / 6.20) and others inside
   * @param p_state the state of which this header is associated with
   */
  verifySeal(p_state: Posterior<JamStateImpl>) {
    const ha = this.blockAuthor(toPosterior(p_state.kappa));
    const verified = Bandersnatch.verifySignature(
      this.seal,
      ha,
      this.toBinary(), // message
      this.sealSignContext(p_state),
    );
    if (!verified) {
      return false;
    }

    // $(0.7.1 - 6.16)
    if (p_state.safroleState.gamma_s.isFallback()) {
      const i = p_state.safroleState.gamma_s.keys![this.slot.slotPhase()];
      if (compareUint8Arrays(i, ha) !== 0) {
        return false;
      }
      return true;
    } else {
      // $(0.7.1 - 6.15)
      const i = p_state.safroleState.gamma_s.tickets![this.slot.slotPhase()];
      // verify ticket identity. if it fails, it means validator is not allowed to produce block
      if (i.id !== Bandersnatch.vrfOutputSignature(this.seal)) {
        return false;
      }
      return true;
    }
  }

  /**
   * verify `Hv`
   * $(0.7.1 - 6.17 / 6.18)
   */
  verifyEntropy(p_state: Posterior<JamStateImpl>) {
    const ha = this.blockAuthor(toPosterior(p_state.kappa));
    return Bandersnatch.verifySignature(
      this.entropySource,
      ha,
      new Uint8Array([]), // message - empty to not bias the entropy
      new Uint8Array([
        ...JAM_ENTROPY,
        ...encodeWithCodec(
          HashCodec,
          Bandersnatch.vrfOutputSignature(this.seal),
        ),
      ]),
    );
  }

  /**
   * Verifies epoch marker `He` is valid
   * $(0.7.1 - 6.27)
   * TODO: move to HeaderEpochMarkerImpl
   */
  verifyEpochMarker = (
    prevState: JamStateImpl,
    p_gamma_p: Posterior<SafroleStateImpl["gamma_p"]>,
  ): boolean => {
    if (toPosterior(this.slot).isNewerEra(prevState.slot)) {
      if (this.epochMarker?.entropy !== prevState.entropy._0) {
        return false;
      }
      if (this.epochMarker!.entropy2 !== prevState.entropy._1) {
        return false;
      }
      for (
        let i = <ValidatorIndex>0;
        i < this.epochMarker!.validators.length;
        i++
      ) {
        if (
          compareUint8Arrays(
            this.epochMarker!.validators[i].bandersnatch,
            p_gamma_p.at(i).banderSnatch,
          ) !== 0 ||
          compareUint8Arrays(
            this.epochMarker!.validators[i].ed25519,
            p_gamma_p.at(i).ed25519,
          ) !== 0
        ) {
          return false;
        }
      }
    } else {
      if (typeof this.epochMarker !== "undefined") {
        return false;
      }
    }
    return true;
  };

  /**
   * check winning tickets Hw
   * $(0.7.1 - 6.28)
   */
  verifyTicketsMark(prevState: JamStateImpl) {
    if (
      this.slot.isSameEra(prevState.slot) &&
      this.slot.slotPhase() < LOTTERY_MAX_SLOT &&
      LOTTERY_MAX_SLOT <= this.slot.slotPhase() &&
      prevState.safroleState.gamma_a.length() === EPOCH_LENGTH
    ) {
      if (this.ticketsMark?.length !== EPOCH_LENGTH) {
        return false;
      }
      const expectedHw = outsideInSequencer(
        prevState.safroleState.gamma_a.elements as unknown as SeqOfLength<
          TicketImpl,
          typeof EPOCH_LENGTH
        >,
      );
      for (let i = 0; i < EPOCH_LENGTH; i++) {
        if (
          this.ticketsMark[i].id !== expectedHw[i].id ||
          this.ticketsMark[i].attempt !== expectedHw[i].attempt
        ) {
          return false;
        }
      }
    } else {
      if (typeof this.ticketsMark !== "undefined") {
        return false;
      }
    }
    return true;
  }

  /**
   * Verify `Ho`
   * $(0.7.1 - 10.20)
   */
  verifyOffenders(disputesExtrinsic: DisputeExtrinsicImpl) {
    const allOffenders = new IdentitySet(this.offendersMark.map((p) => p));
    for (const c of disputesExtrinsic.culprits.elements) {
      if (!allOffenders.has(c.key)) {
        return false;
      }
    }

    for (const f of disputesExtrinsic.faults.elements) {
      if (!allOffenders.has(f.key)) {
        return false;
      }
    }
    return true;
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("JamSignedHeaderImpl", () => {
    it("header_0.bin", () => {
      const bin = getCodecFixtureFile("header_0.bin");
      const { value: header } = JamSignedHeaderImpl.decode(bin);
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("header_0.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("header_0.json")).toString("utf8"),
      );
      const eg = JamSignedHeaderImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
    it("header_1.bin", () => {
      const bin = getCodecFixtureFile("header_1.bin");
      const { value: header } = JamSignedHeaderImpl.decode(bin);
      expect(Buffer.from(header.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("header_1.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("header_1.json")).toString("utf8"),
      );
      const eg = JamSignedHeaderImpl.fromJSON(json);

      expect(eg.toJSON()).to.deep.eq(json);
    });
  });
}
