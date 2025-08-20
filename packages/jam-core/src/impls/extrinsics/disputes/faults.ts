import { DisputesStateImpl } from "@/impls/disputes-state-impl";
import { KappaImpl } from "@/impls/kappa-impl";
import { LambdaImpl } from "@/impls/lambda-impl";
import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet } from "@/data-structures/identity-set";
import {
  BaseJamCodecable,
  booleanCodec,
  codec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { JAM_INVALID, JAM_VALID } from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import type {
  DisputeFault,
  ED25519PublicKey,
  ED25519Signature,
  Hash,
  Validated,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import { compareUint8Arrays } from "uint8array-extras";
import { VerdictVoteKind } from "./verdicts";

@JamCodecable()
export class DisputeFaultImpl extends BaseJamCodecable implements DisputeFault {
  /**
   * the hash of the work report
   * - if (validity === 0) then the work report must be in posterior `psi_g` and **NOT** in posterior `psi_b`
   * - if (validity === 1) then the work report must **NOT** be in posterior `psi_g` and in posterior `psi_b`
   * @see DisputesState.psi_b
   * @see DisputesState.psi_g
   */
  @codec(HashCodec)
  target!: Hash;
  /**
   * the signaled validity of the work report
   */
  @booleanCodec()
  vote!: boolean;
  /**
   * the validator public key
   * This must be either in the current or prev set of validators
   * and it must not be inside DisputesState.psi_o
   * @see DisputesState.psi_o
   */
  @codec(xBytesCodec(32))
  key!: ED25519PublicKey;
  /**
   * payload should be $jam_valid + workReportHash or $jam_invalid + workReportHash
   */
  @codec(xBytesCodec(64))
  signature!: ED25519Signature;

  isSignatureValid(): boolean {
    return Ed25519.verifySignature(
      this.signature,
      this.key,
      new Uint8Array([
        ...(this.vote ? JAM_VALID : JAM_INVALID),
        ...this.target,
      ]),
    );
  }
}

@JamCodecable()
export class DisputesFaults extends BaseJamCodecable {
  @lengthDiscriminatedCodec(DisputeFaultImpl, SINGLE_ELEMENT_CLASS)
  elements!: DisputeFaultImpl[];

  constructor(elements: DisputeFaultImpl[] = []) {
    super();
    this.elements = elements;
  }

  checkValidity(deps: {
    bold_v: { reportHash: Hash; votes: VerdictVoteKind }[];
    lambda: LambdaImpl;
    kappa: KappaImpl;
    disputesState: DisputesStateImpl;
  }): Result<Validated<DisputesFaults>, DisputesFaultError> {
    const positiveVerdicts = deps.bold_v.filter(
      (v) => v.votes === VerdictVoteKind.TWO_THIRD_PLUS_ONE,
    );
    // ensure any positive verdicts are in faults
    // $(0.7.1 - 10.13)
    if (
      false ===
      positiveVerdicts.every((v) =>
        this.elements.some(
          (f) => compareUint8Arrays(f.target, v.reportHash) === 0,
        ),
      )
    ) {
      return err(DisputesFaultError.POSITIVE_VERDICTS_NOT_IN_FAULTS);
    }

    // $(0.7.1 - 10.3)
    const bold_k = new IdentitySet([
      ...deps.kappa.elements.map((v) => v.ed25519),
      ...deps.lambda.elements.map((v) => v.ed25519),
    ]);
    // remove offenders
    deps.disputesState.offenders.forEach((offender) => bold_k.delete(offender));

    // $(0.7.1 - 10.6) - partial - misses the posterior check
    // check faults key is in lambda or kappa
    const checkFaultKeys = this.elements.every(({ key }) => bold_k.has(key));
    if (!checkFaultKeys) {
      return err(DisputesFaultError.FAULTKEYNOTINK);
    }
    const checkFaultSignatures = this.elements.every((fault) =>
      fault.isSignatureValid(),
    );
    if (!checkFaultSignatures) {
      return err(DisputesFaultError.FAULTSIGNATURESWRONG);
    }

    // enforce faults are ordered by ed25519PublicKey
    // $(0.7.1 - 10.8)
    if (this.elements.length > 0) {
      for (let i = 1; i < this.elements.length; i++) {
        const [prev, curr] = [this.elements[i - 1], this.elements[i]];
        if (compareUint8Arrays(prev.key, curr.key) >= 0) {
          return err(
            DisputesFaultError.FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
          );
        }
      }
    }

    return ok(toTagged(this));
  }

  static empty(): DisputesFaults {
    return new DisputesFaults([]);
  }
}

export enum DisputesFaultError {
  FAULTSIGNATURESWRONG = "FAULTSIGNATURESWRONG",
  FAULTKEYNOTINK = "FAULTKEYNOTINK",
  FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY = "FAULTS_NOT_ORDERED_BY_ED25519_PUBLIC_KEY",
  POSITIVE_VERDICTS_NOT_IN_FAULTS = "POSITIVE_VERDICTS_NOT_IN_FAULTS",
}
