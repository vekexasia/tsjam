import { HashCodec } from "@/codecs/misc-codecs";
import {
  BaseJamCodecable,
  BitSequenceCodec,
  bitSequenceCodec,
  codec,
  encodeWithCodec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { CORES, JAM_AVAILABLE, NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { Ed25519, Hashing } from "@tsjam/crypto";
import type {
  AssuranceExtrinsic,
  CoreIndex,
  Dagger,
  EA_Extrinsic,
  ED25519Signature,
  Hash,
  HeaderHash,
  SeqOfLength,
  UpToSeq,
  Validated,
  ValidatorIndex,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { compareUint8Arrays } from "uint8array-extras";
import type { JamStateImpl } from "../jam-state-impl";
import { NewWorkReportsImpl } from "../new-work-reports-impl";
import type { RHOImpl } from "../rho-impl";
import { Result, err, ok } from "neverthrow";

/**
 * Single extrinsic element
 * codec order defined in $(0.7.1 - C.27)
 */
@JamCodecable()
export class AssuranceExtrinsicImpl
  extends BaseJamCodecable
  implements AssuranceExtrinsic
{
  /**
   * `a` the hash of parent header
   **/
  @codec(HashCodec, "anchor")
  anchorHash!: Hash;

  /**
   * `f`
   */
  @bitSequenceCodec(CORES, "bitfield")
  bitstring!: SeqOfLength<0 | 1, typeof CORES>;

  /**
   * `v` the validator index assuring they're contributing to the Data availability
   */
  @eSubIntCodec(2, "validator_index")
  validatorIndex!: ValidatorIndex;

  /**
   * `s` the signature of the validator
   */
  @codec(xBytesCodec(64), "signature")
  signature!: ED25519Signature;

  /**
   * $(0.7.1 - 11.13)
   */
  isSignatureValid(deps: {
    kappa: JamStateImpl["kappa"];
    headerParent: HeaderHash;
  }) {
    return Ed25519.verifySignature(
      this.signature,
      deps.kappa.at(this.validatorIndex).ed25519,
      new Uint8Array([
        ...JAM_AVAILABLE, // XA
        ...Hashing.blake2b(
          new Uint8Array([
            ...encodeWithCodec(HashCodec, deps.headerParent),
            ...encodeWithCodec(BitSequenceCodec(CORES), this.bitstring),
          ]),
        ),
      ]),
    );
  }

  isValid(deps: {
    headerParent: HeaderHash;
    kappa: JamStateImpl["kappa"];
    d_rho: Dagger<RHOImpl>;
  }): this is Validated<AssuranceExtrinsicImpl> {
    // begin with $(0.7.1 - 11.10)
    if (this.validatorIndex >= NUMBER_OF_VALIDATORS) {
      return false;
    }
    if (this.bitstring.length !== CORES) {
      return false;
    }

    // $(0.7.1 - 11.11)
    if (compareUint8Arrays(this.anchorHash, deps.headerParent) !== 0) {
      return false;
    }

    // $(0.7.1 - 11.15)
    for (let c = <CoreIndex>0; c < CORES; c++) {
      if (this.bitstring[c] === 1) {
        // af[c]
        // bit must be set only if corresponding core has a report pending availability
        if (typeof deps.d_rho.elementAt(c) === "undefined") {
          return false;
        }
      }
    }

    // $(0.7.1 - 11.13)
    return this.isSignatureValid({
      kappa: deps.kappa,
      headerParent: deps.headerParent,
    });
  }
}

/**
 * Assurances Extrinsic
 * $(0.7.1 - C.20) | codec
 */
@JamCodecable()
export class AssurancesExtrinsicImpl
  extends BaseJamCodecable
  implements EA_Extrinsic
{
  @lengthDiscriminatedCodec(AssuranceExtrinsicImpl, SINGLE_ELEMENT_CLASS)
  elements!: UpToSeq<AssuranceExtrinsicImpl, typeof NUMBER_OF_VALIDATORS>;

  constructor(elements: AssuranceExtrinsicImpl[] = []) {
    super();
    this.elements = toTagged(elements);
  }

  nPositiveVotes(core: CoreIndex) {
    return this.elements.reduce((a, b) => a + b.bitstring[core], 0);
  }

  checkValidity(deps: {
    headerParent: HeaderHash;
    kappa: JamStateImpl["kappa"];
    d_rho: Dagger<RHOImpl>;
  }): Result<Validated<AssurancesExtrinsicImpl>, EAValidationError> {
    // $(0.7.1 - 11.10)
    if (this.elements.length > NUMBER_OF_VALIDATORS) {
      return err(EAValidationError.EA_TOO_MANY_VALIDATORS);
    }

    // $(0.7.1 - 11.12)
    for (let i = 1; i < this.elements.length; i++) {
      if (
        this.elements[i - 1].validatorIndex >= this.elements[i].validatorIndex
      ) {
        return err(EAValidationError.EA_VALIDATORS_NOT_ORDERED_OR_UNIQUE);
      }
    }

    for (let i = 0; i < this.elements.length; i++) {
      if (
        !this.elements[i].isValid({
          headerParent: deps.headerParent,
          kappa: deps.kappa,
          d_rho: deps.d_rho,
        })
      ) {
        return err(EAValidationError.EA_SINGLE_ELEMENT_INVALID);
      }
    }

    return ok(toTagged(this));
  }

  /**
   * Computes `bold R` in
   * $(0.7.1 - 11.16)
   */
  static newlyAvailableReports(
    ea: Validated<AssurancesExtrinsicImpl>,
    d_rho: Dagger<RHOImpl>,
  ): NewWorkReportsImpl {
    const bold_R = new NewWorkReportsImpl();
    for (let c = <CoreIndex>0; c < CORES; c++) {
      const sum = ea.nPositiveVotes(c);

      if (sum > (NUMBER_OF_VALIDATORS * 2) / 3) {
        bold_R.elements.push(d_rho.elementAt(c)!.workReport);
      }
    }
    return bold_R;
  }

  static newEmpty(): AssurancesExtrinsicImpl {
    return new AssurancesExtrinsicImpl([]);
  }
}

export enum EAValidationError {
  EA_TOO_MANY_VALIDATORS = "EA_TOO_MANY_VALIDATORS",
  EA_VALIDATORS_NOT_ORDERED_OR_UNIQUE = "EA_VALIDATORS_NOT_ORDERED_OR_UNIQUE",
  EA_SINGLE_ELEMENT_INVALID = "EA_SINGLE_ELEMENT_INVALID",
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { getCodecFixtureFile } = await import("@/test/codec-utils.js");
  describe("codecEa", () => {
    it("assurances_extrinsic.bin", () => {
      const bin = getCodecFixtureFile("assurances_extrinsic.bin");
      const { value: ea } = AssurancesExtrinsicImpl.decode(bin);
      expect(Buffer.from(ea.toBinary()).toString("hex")).toBe(
        Buffer.from(bin).toString("hex"),
      );
    });
    it("assurances_extrinsic.json", () => {
      const json = JSON.parse(
        Buffer.from(getCodecFixtureFile("assurances_extrinsic.json")).toString(
          "utf8",
        ),
      );
      const ea: AssurancesExtrinsicImpl =
        AssurancesExtrinsicImpl.fromJSON(json);

      expect(ea.toJSON()).to.deep.eq(json);
    });
  });
}
