import { HashCodec } from "@/codecs/misc-codecs";
import {
  codec,
  encodeWithCodec,
  JamCodecable,
  xBytesCodec,
} from "@tsjam/codec";
import {
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
} from "@tsjam/constants";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import {
  BandersnatchKey,
  BandersnatchSignature,
  HeaderHash,
  Posterior,
  SignedJamHeader,
  Validated,
  ValidatorIndex,
} from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { compareUint8Arrays } from "uint8array-extras";
import type { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import { GammaPImpl } from "./gamma-p-impl";
import { GammaSImpl } from "./gamma-s-impl";
import { HeaderEpochMarkerImpl } from "./header-epoch-marker-impl";
import { HeaderOffenderMarkerImpl } from "./header-offender-marker-impl";
import { HeaderTicketMarkerImpl } from "./header-ticket-marker-impl";
import { JamBlockExtrinsicsImpl } from "./jam-block-extrinsics-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { JamHeaderImpl } from "./jam-header-impl";
import type { JamStateImpl } from "./jam-state-impl";
import { TauImpl } from "./slot-impl";

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

  public static sealSignContext(
    p_entropy: Posterior<JamEntropyImpl>,
    p_gamma_s: Posterior<GammaSImpl>,
    p_tau: Validated<Posterior<TauImpl>>,
  ): Uint8Array {
    if (p_gamma_s.isFallback()) {
      return new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...encodeWithCodec(HashCodec, p_entropy._3),
      ]);
    } else {
      const i = p_gamma_s.tickets![p_tau.slotPhase()];
      return new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...encodeWithCodec(HashCodec, p_entropy._3),
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
      encodeWithCodec(JamHeaderImpl, this), // message
      JamSignedHeaderImpl.sealSignContext(
        toPosterior(p_state.entropy),
        toPosterior(p_state.safroleState.gamma_s),
        toTagged(toPosterior(<TauImpl>this.slot)),
      ),
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

  verifyEpochMarker(
    prevState: JamStateImpl,
    deps: { p_gamma_p: Posterior<GammaPImpl> },
  ) {
    return HeaderEpochMarkerImpl.validate(this.epochMarker, {
      p_tau: toTagged(this.slot),
      tau: prevState.slot,
      entropy: prevState.entropy,
      p_gamma_p: deps.p_gamma_p,
    });
  }

  verifyTicketsMark(prevState: JamStateImpl) {
    return HeaderTicketMarkerImpl.validate(this.ticketsMark, {
      p_tau: toTagged(this.slot),
      tau: prevState.slot,
      gamma_a: prevState.safroleState.gamma_a,
    });
  }

  /**
   * Verify `Ho`
   * $(0.7.1 - 10.20)
   */
  verifyOffenders(disputesExtrinsic: Validated<DisputeExtrinsicImpl>) {
    return this.offendersMark.checkValidity(disputesExtrinsic);
  }

  buildNext(
    curState: JamStateImpl,
    extrinsics: JamBlockExtrinsicsImpl,
    p_tau: Validated<Posterior<TauImpl>>,
    privKey: BandersnatchKey,
  ) {
    const authorIndex = <ValidatorIndex>0;
    const p_entropy = toPosterior(new JamEntropyImpl());
    const p_gamma_s = toPosterior(new GammaSImpl());
    const p_gamma_p = toPosterior(new GammaPImpl());

    // FIXME: all of the above ^^
    const sealSignContext = JamSignedHeaderImpl.sealSignContext(
      p_entropy,
      p_gamma_s,
      p_tau,
    );

    const toRet = new JamSignedHeaderImpl({
      parent: this.signedHash(),
      parentStateRoot: curState.merkleRoot(),
      slot: p_tau,
      authorIndex: authorIndex,
      ticketsMark: HeaderTicketMarkerImpl.build({
        p_tau,
        tau: curState.slot,
        gamma_a: curState.safroleState.gamma_a,
      }),
      extrinsicHash: extrinsics.extrinsicHash(),
      epochMarker: HeaderEpochMarkerImpl.build({
        p_tau,
        tau: curState.slot,
        entropy: p_entropy,
        p_gamma_p,
      }),
      entropySource: Bandersnatch.sign(
        privKey,
        new Uint8Array([]), // message - empty to not bias the entropy
        new Uint8Array([
          ...JAM_ENTROPY,
          ...encodeWithCodec(
            HashCodec,
            Bandersnatch.vrfOutputSeed(privKey, sealSignContext),
          ),
        ]),
      ),
      offendersMark: HeaderOffenderMarkerImpl.build(
        toTagged(extrinsics.disputes),
      ),
    });

    toRet.seal = Bandersnatch.sign(
      privKey,
      encodeWithCodec(JamHeaderImpl, this), // EU(H)
      sealSignContext,
    );

    return toRet;
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
