import { outsideInSequencer } from "@/utils";
import {
  ArrayOfJSONCodec,
  BandersnatchCodec,
  BandersnatchKeyJSONCodec,
  bandersnatchSignatureCodec,
  BaseJamCodecable,
  createCodec,
  createJSONCodec,
  createSequenceCodec,
  Ed25519PubkeyCodec,
  Ed25519PublicKeyJSONCodec,
  encodeWithCodec,
  eSubIntCodec,
  HashCodec,
  hashCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  optionalCodec,
  sequenceCodec,
} from "@tsjam/codec";
import {
  EPOCH_LENGTH,
  JAM_ENTROPY,
  JAM_FALLBACK_SEAL,
  JAM_TICKET_SEAL,
  LOTTERY_MAX_SLOT,
  NUMBER_OF_VALIDATORS,
} from "@tsjam/constants";
import { Bandersnatch, Hashing } from "@tsjam/crypto";
import {
  BandersnatchKey,
  BandersnatchSignature,
  Blake2bHash,
  ED25519PublicKey,
  EpochMarker,
  Hash,
  HeaderHash,
  JamHeader,
  Posterior,
  SeqOfLength,
  SignedJamHeader,
  StateRootHash,
  Tau,
  ValidatorIndex,
} from "@tsjam/types";
import { isNewEra, isSameEra, slotIndex } from "@tsjam/utils";
import { compareUint8Arrays } from "uint8array-extras";
import { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import { JamBlockExtrinsicsImpl } from "./JamBlockExtrinsicsImpl";
import { JamStateImpl } from "./JamStateImpl";
import { SafroleStateImpl } from "./SafroleStateImpl";
import { TicketImpl } from "./TicketImpl";

@JamCodecable()
export class EpochMarkerImpl extends BaseJamCodecable implements EpochMarker {
  @hashCodec()
  entropy!: Blake2bHash;

  @hashCodec("tickets_entropy")
  entropy2!: Blake2bHash;
  @sequenceCodec(NUMBER_OF_VALIDATORS, <any>{
    ...createCodec([
      ["bandersnatch", BandersnatchCodec],
      ["ed25519", Ed25519PubkeyCodec],
    ]),
    ...createJSONCodec<any>([
      ["bandersnatch", "bandersnatch", BandersnatchKeyJSONCodec],
      ["ed25519", "ed25519", Ed25519PublicKeyJSONCodec],
    ]),
  })
  validators!: SeqOfLength<
    {
      bandersnatch: BandersnatchKey;
      ed25519: ED25519PublicKey;
    },
    typeof NUMBER_OF_VALIDATORS,
    "validators"
  >;
}

@JamCodecable()
export class JamHeaderImpl extends BaseJamCodecable implements JamHeader {
  /**
   * **HP:** The hash of the parent header.
   * note: the genesis block has no parent, so its parent hash is 0.
   */
  @hashCodec()
  parent!: HeaderHash;

  /**
   * **HR:** The hash of the state root.
   * It's computed by applying the `Mσ` fn to the `σ`
   * @see JamState
   */
  @hashCodec("parent_state_root")
  parentStateRoot!: StateRootHash;

  /**
   * **HX:** The hash of the block's extrinsic data.
   */
  @hashCodec("extrinsic_hash")
  extrinsicHash!: Hash;

  /**
   * **HT:** The block's time slot index since jam epoch (time slot is 6 secs long).
   */
  @eSubIntCodec(4)
  slot!: Tau;

  /**
   * **He:** The epoch marker of the block.
   * it basically contains the epoch-length bandersnatch keys in case next epoch is in fallback mode
   * hence the length of kb or validatorKeys is `epoch-length`
   * $(0.7.0 - 5.10)
   */
  @optionalCodec(EpochMarkerImpl, "epoch_mark")
  epochMarker?: EpochMarkerImpl;
  /**
   * `HW` - The winning tickets of the block.
   * set on after end of the lottery
   * and the lottery accumulator (gamma_a) is saturated (epoch-length)
   * and we're not changing epoch
   */
  @optionalCodec(
    <any>{
      ...createSequenceCodec(EPOCH_LENGTH, TicketImpl),
      ...ArrayOfJSONCodec(TicketImpl),
    },
    "tickets_mark",
  )
  ticketsMark?: SeqOfLength<TicketImpl, typeof EPOCH_LENGTH>;
  /**
   * `HO`
   * @see DisputesState.psi_w
   * @see DisputesState.psi_b
   */
  @lengthDiscriminatedCodec(
    {
      ...Ed25519PubkeyCodec,
      ...Ed25519PublicKeyJSONCodec,
    },
    "offenders_mark",
  )
  offendersMark!: ED25519PublicKey[];

  /**
   * `HI`
   */
  @eSubIntCodec(2, "author_index")
  authorIndex!: ValidatorIndex;

  /**
   * `HV` -
   */
  @bandersnatchSignatureCodec("entropy_source")
  entropySource!: BandersnatchSignature;

  unsignedHash(): HeaderHash {
    return Hashing.blake2b(encodeWithCodec(JamHeaderImpl, this));
  }

  /**
   * $(0.7.1 - 5.4)
   */
  verifyExtrinsicHash(extrinsics: JamBlockExtrinsicsImpl) {
    return this.extrinsicHash === extrinsics.extrinsicHash();
  }
}

@JamCodecable()
export class JamSignedHeaderImpl
  extends JamHeaderImpl
  implements SignedJamHeader
{
  @bandersnatchSignatureCodec()
  seal!: BandersnatchSignature;

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
      const i = state.safroleState.gamma_s.tickets![this.slot % EPOCH_LENGTH];
      return new Uint8Array([
        ...JAM_TICKET_SEAL,
        ...encodeWithCodec(HashCodec, state.entropy._3),
        i.attempt,
      ]);
    }
  }

  /**
   * Verify Hs
   * $(0.7.0 - 6.15 / 6.16 / 6.18 / 6.19 / 6.20)
   * @param p_state the state of which this header is associated with
   */
  verifySeal(p_state: Posterior<JamStateImpl>) {
    const ha = p_state.blockAuthor();
    const verified = Bandersnatch.verifySignature(
      this.seal,
      ha.banderSnatch,
      this.toBinary(), // message
      this.sealSignContext(p_state),
    );
    if (!verified) {
      return false;
    }

    // $(0.7.0 - 6.16)
    if (p_state.safroleState.gamma_s.isFallback()) {
      const i = p_state.safroleState.gamma_s.keys![this.slot % EPOCH_LENGTH];
      if (compareUint8Arrays(i, ha.banderSnatch) !== 0) {
        return false;
      }
      return true;
    } else {
      // $(0.7.0 - 6.15)
      const i = p_state.safroleState.gamma_s.tickets![this.slot % EPOCH_LENGTH];
      // verify ticket identity. if it fails, it means validator is not allowed to produce block
      if (i.id !== Bandersnatch.vrfOutputSignature(this.seal)) {
        return false;
      }
      return true;
    }
  }

  /**
   * verify `Hv`
   * @see $(0.7.0 - 6.17 - 6.18)
   */
  verifyEntropy(p_state: Posterior<JamStateImpl>) {
    const ha = p_state.blockAuthor();
    return Bandersnatch.verifySignature(
      this.entropySource,
      ha.banderSnatch,
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
   * $(0.7.0 - 6.27)
   */
  verifyEpochMarker = (
    prevState: JamStateImpl,
    p_gamma_p: Posterior<SafroleStateImpl["gamma_p"]>,
  ): boolean => {
    if (isNewEra(this.slot, prevState.tau)) {
      if (this.epochMarker?.entropy !== prevState.entropy._0) {
        return false;
      }
      if (this.epochMarker!.entropy2 !== prevState.entropy._1) {
        return false;
      }
      for (let i = 0; i < this.epochMarker!.validators.length; i++) {
        if (
          Buffer.compare(
            this.epochMarker!.validators[i].bandersnatch,
            p_gamma_p.at(i).banderSnatch,
          ) !== 0 ||
          Buffer.compare(
            this.epochMarker!.validators[i].ed25519.buf,
            p_gamma_p.at(i).ed25519.buf,
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

  // check winning tickets Hw
  // $(0.7.0 - 6.28)
  verifyTicketsMark(prevState: JamStateImpl) {
    if (
      isSameEra(this.slot, prevState.tau) &&
      slotIndex(this.slot) < LOTTERY_MAX_SLOT &&
      LOTTERY_MAX_SLOT <= slotIndex(this.slot) &&
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
   * $(0.6.4 - 10.20)
   */
  verifyOffenders(disputesExtrinsic: DisputeExtrinsicImpl) {
    const allOffenders = new Set(this.offendersMark.map((p) => p.bigint));
    for (const c of disputesExtrinsic.culprits) {
      if (!allOffenders.has(c.key.bigint)) {
        return false;
      }
    }

    for (const f of disputesExtrinsic.faults) {
      if (!allOffenders.has(f.key.bigint)) {
        return false;
      }
    }
    return true;
  }
}

export enum EpochMarkerError {
  InvalidEntropy = "InvalidEntropy",
  InvalidEpochMarkerValidator = "InvalidEpochMarkerValidator",
  InvalidEpochMarker = "InvalidEpochMarker",
}
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const { getCodecFixtureFile } = await import("@/test/codec_utils.js");
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
