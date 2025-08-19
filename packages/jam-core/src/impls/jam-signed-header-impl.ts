import { HashCodec } from "@/codecs/misc-codecs";
import {
  BufferJSONCodec,
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
  Hash,
  HeaderHash,
  Posterior,
  SignedJamHeader,
  Validated,
  ValidatorIndex,
} from "@tsjam/types";
import { toPosterior, toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { ConditionalExcept } from "type-fest";
import { compareUint8Arrays } from "uint8array-extras";
import type { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import { GammaPImpl } from "./gamma-p-impl";
import type { GammaSImpl } from "./gamma-s-impl";
import { HeaderEpochMarkerImpl } from "./header-epoch-marker-impl";
import { HeaderOffenderMarkerImpl } from "./header-offender-marker-impl";
import { HeaderTicketMarkerImpl } from "./header-ticket-marker-impl";
import { JamBlockExtrinsicsImpl } from "./jam-block-extrinsics-impl";
import { JamEntropyImpl } from "./jam-entropy-impl";
import { JamHeaderImpl } from "./jam-header-impl";
import type { JamStateImpl } from "./jam-state-impl";
import { KappaImpl } from "./kappa-impl";
import { TauImpl } from "./slot-impl";
import { DisputesToPosteriorError } from "./disputes-state-impl";

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
    p_entropy_3: Posterior<JamEntropyImpl["_3"]>,
    p_gamma_s: Posterior<GammaSImpl>,
    p_tau: Validated<Posterior<TauImpl>>,
  ): Uint8Array {
    if (p_gamma_s.isFallback()) {
      return new Uint8Array([
        ...JAM_FALLBACK_SEAL,
        ...encodeWithCodec(HashCodec, p_entropy_3),
      ]);
    } else {
      const i = p_gamma_s.tickets![p_tau.slotPhase()];
      return new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...encodeWithCodec(HashCodec, p_entropy_3),
        i.attempt,
      ]);
    }
  }

  /**
   * $(0.7.1 - 5.9)
   */
  blockAuthor(p_kappa: Posterior<KappaImpl>) {
    return p_kappa.at(this.authorIndex)!.banderSnatch;
  }

  /**
   * Verify Hs
   * $(0.7.1 - 6.18 / 6.19 / 6.20) and others inside
   * @param p_state the state of which this header is associated with
   */
  verifySeal(deps: {
    p_kappa: Posterior<KappaImpl>;
    p_entropy_3: Posterior<JamEntropyImpl["_3"]>;
    p_gamma_s: Posterior<GammaSImpl>;
  }) {
    const ha = this.blockAuthor(deps.p_kappa);
    const verified = Bandersnatch.verifySignature(
      this.seal,
      ha,
      encodeWithCodec(JamHeaderImpl, this), // message
      JamSignedHeaderImpl.sealSignContext(
        deps.p_entropy_3,
        deps.p_gamma_s,
        toTagged(toPosterior(<TauImpl>this.slot)),
      ),
    );
    if (!verified) {
      return false;
    }

    // $(0.7.1 - 6.16)
    if (deps.p_gamma_s.isFallback()) {
      const i = deps.p_gamma_s.keys![this.slot.slotPhase()];
      if (compareUint8Arrays(i, ha) !== 0) {
        return false;
      }
      return true;
    } else {
      // $(0.7.1 - 6.15)
      const i = deps.p_gamma_s.tickets![this.slot.slotPhase()];
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
  private verifyEntropy(p_kappa: Posterior<KappaImpl>) {
    const ha = this.blockAuthor(p_kappa);
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
    keyPair: { public: BandersnatchKey; private: BandersnatchKey },
  ): Result<
    JamSignedHeaderImpl,
    DisputesToPosteriorError | HeaderCreationError
  > {
    const p_kappa = curState.kappa.toPosterior(curState, { p_tau });
    const p_entropy_1_3 = curState.entropy.rotate1_3({
      slot: curState.slot,
      p_tau,
    });
    const p_gamma_s = curState.safroleState.gamma_s.toPosterior({
      slot: curState.slot,
      safroleState: curState.safroleState,
      p_tau: p_tau,
      p_kappa,
      p_eta2: p_entropy_1_3._2,
    });
    // we need to check if the given priv/public is the one authorized
    if (
      !p_gamma_s.isKeyAllowedToProduce(keyPair, {
        p_tau,
        p_entropy_3: p_entropy_1_3._3,
      })
    ) {
      return err(HeaderCreationError.KEY_NOT_ALLOWED);
    }
    const authorIndex = p_kappa.bandersnatchIndex(keyPair.public);
    if (authorIndex === -1) {
      // should never happen but it's pleasing the compiler
      return err(HeaderCreationError.KEY_INDEX_NOT_FOUND);
    }
    const [dispErr, p_disputes] = curState.disputes
      .toPosterior({
        kappa: curState.kappa,
        extrinsic: toTagged(extrinsics.disputes),
        lambda: curState.lambda,
      })
      .safeRet();
    if (dispErr) {
      return err(dispErr);
    }

    const p_gamma_p = curState.safroleState.gamma_p.toPosterior({
      slot: curState.slot,
      iota: curState.iota,
      p_tau: p_tau,
      p_offenders: toPosterior(p_disputes.offenders),
    });

    const sealSignContext = JamSignedHeaderImpl.sealSignContext(
      toPosterior(p_entropy_1_3._3),
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
        entropy: curState.entropy,
        p_gamma_p,
      }),
      entropySource: Bandersnatch.sign(
        keyPair.private,
        new Uint8Array([]), // message - empty to not bias the entropy
        new Uint8Array([
          ...JAM_ENTROPY,
          ...encodeWithCodec(
            HashCodec,
            Bandersnatch.vrfOutputSeed(keyPair.private, sealSignContext),
          ),
        ]),
      ),
      offendersMark: HeaderOffenderMarkerImpl.build(
        toTagged(extrinsics.disputes),
      ),
    });

    toRet.seal = Bandersnatch.sign(
      keyPair.private,
      encodeWithCodec(JamHeaderImpl, toRet), // EU(H)
      sealSignContext,
    );

    return ok(toRet);
  }

  checkValidity(deps: {
    extrinsicHash: Hash;
    disputesExtrinsic: Validated<DisputeExtrinsicImpl>;
    prevHeader: JamSignedHeaderImpl;
    curState: JamStateImpl;
    p_kappa: Posterior<KappaImpl>;
    p_gamma_s: Posterior<GammaSImpl>;
    p_gamma_p: Posterior<GammaPImpl>;
    p_entropy_3: Posterior<JamEntropyImpl["_3"]>;
  }): Result<Validated<JamSignedHeaderImpl>, HeaderValidationError> {
    if (compareUint8Arrays(this.parent, deps.prevHeader.signedHash()) !== 0) {
      return err(HeaderValidationError.INVALID_PARENT);
    }

    // NOTE: slot is not being checked here as it is checked in the state

    // $(0.7.1 - 5.8)
    if (
      compareUint8Arrays(deps.curState.merkleRoot(), this.parentStateRoot) !== 0
    ) {
      return err(HeaderValidationError.INVALID_PARENT_STATE_ROOT);
    }

    if (
      false ===
      this.verifySeal({
        p_kappa: deps.p_kappa,
        p_gamma_s: deps.p_gamma_s,
        p_entropy_3: deps.p_entropy_3,
      })
    ) {
      return err(HeaderValidationError.SEAL_INVALID);
    }

    if (
      false ===
      HeaderEpochMarkerImpl.validate(this.epochMarker, {
        p_tau: toTagged(this.slot),
        tau: deps.curState.slot,
        entropy: deps.curState.entropy,
        p_gamma_p: deps.p_gamma_p,
      })
    ) {
      return err(HeaderValidationError.INVALID_EPOCH_MARKER);
    }

    if (
      false ===
      HeaderTicketMarkerImpl.validate(this.ticketsMark, {
        p_tau: toTagged(this.slot),
        tau: deps.curState.slot,
        gamma_a: deps.curState.safroleState.gamma_a,
      })
    ) {
      return err(HeaderValidationError.INVALID_TICKET_MARKER);
    }

    /**
     * $(0.7.1 - 5.4)
     */
    if (compareUint8Arrays(this.extrinsicHash, deps.extrinsicHash) !== 0) {
      return err(HeaderValidationError.INVALID_EXTRINSIC_HASH);
    }

    if (false === this.verifyEntropy(deps.p_kappa)) {
      return err(HeaderValidationError.INVALID_ENTROPY_SOURCE);
    }

    if (false === this.verifyOffenders(deps.disputesExtrinsic)) {
      return err(HeaderValidationError.INVALID_OFFENDERS);
    }

    return ok(toTagged(this));
  }
}

export enum HeaderCreationError {
  KEY_NOT_ALLOWED = "KEY_NOT_ALLOWED",
  KEY_INDEX_NOT_FOUND = "KEY_INDEX_NOT_FOUND",
}

export enum HeaderValidationError {
  INVALID_PARENT = "INVALID_PARENT",
  INVALID_PARENT_STATE_ROOT = "INVALID_PARENT_STATE_ROOT",
  SEAL_INVALID = "SEAL_INVALID",
  INVALID_EPOCH_MARKER = "INVALID_EPOCH_MARKER",
  INVALID_TICKET_MARKER = "INVALID_TICKET_MARKER",
  INVALID_EXTRINSIC_HASH = "INVALID_EXTRINSIC_HASH",
  INVALID_ENTROPY_SOURCE = "INVALID_ENTROPY_SOURCE",
  INVALID_OFFENDERS = "INVALID_OFFENDERS",
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("JamSignedHeaderImpl", () => {
    describe("codec", () => {
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
  });
}
