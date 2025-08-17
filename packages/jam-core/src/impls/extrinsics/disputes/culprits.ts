import { DisputesStateImpl } from "@/impls/disputes-state-impl";
import { KappaImpl } from "@/impls/kappa-impl";
import { LambdaImpl } from "@/impls/lambda-impl";
import { HashCodec } from "@/codecs/misc-codecs";
import { IdentitySet } from "@/data-structures/identity-set";
import {
  BaseJamCodecable,
  codec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { JAM_GUARANTEE } from "@tsjam/constants";
import { Ed25519 } from "@tsjam/crypto";
import {
  DisputeCulprit,
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
export class DisputeCulpritImpl
  extends BaseJamCodecable
  implements DisputeCulprit
{
  /**
   * `r` - the hash of the work report
   * this will alter DisputesState.psi_b by making sure that the work report is in the set
   * @see DisputesState.psi_b
   */
  @codec(HashCodec)
  target!: Hash;
  /**
   * `f` - the validator public key
   * This must be either in the current or prev set of validators
   * it must not be inside DisputesState.psi_o
   * @see DisputesState.psi_o
   */
  @codec(xBytesCodec(32))
  key!: ED25519PublicKey;

  /**
   * `s` - the signature of the garantor payload
   * the payload needs to be $jam_guarantee + workReportHash
   */
  @codec(xBytesCodec(64))
  signature!: ED25519Signature;

  isSignatureValid(): boolean {
    return Ed25519.verifySignature(
      this.signature,
      this.key,
      new Uint8Array([...JAM_GUARANTEE, ...this.target]),
    );
  }
}

@JamCodecable()
export class DisputesCulprits extends BaseJamCodecable {
  @lengthDiscriminatedCodec(DisputeCulpritImpl, SINGLE_ELEMENT_CLASS)
  elements!: DisputeCulpritImpl[];

  constructor(elements: DisputeCulpritImpl[] = []) {
    super();
    this.elements = elements;
  }

  checkValidity(deps: {
    lambda: LambdaImpl;
    kappa: KappaImpl;
    disputesState: DisputesStateImpl;
    bold_v: { reportHash: Hash; votes: VerdictVoteKind }[];
  }): Result<Validated<DisputesCulprits>, DisputesCulpritError> {
    const bold_k = new IdentitySet([
      ...deps.kappa.elements.map((v) => v.ed25519),
      ...deps.lambda.elements.map((v) => v.ed25519),
    ]);
    deps.disputesState.offenders.forEach((k) => bold_k.delete(k));

    //console.log(IdentitySetCodec(xBytesCodec(32)).toJSON(bold_k));
    // $(0.7.1 - 10.5) - partial - misses the r \in p_psi_b
    // check culprit key is in lambda or kappa
    const checkCulpritKeys = this.elements.every(({ key }) => bold_k.has(key));
    if (!checkCulpritKeys) {
      return err(DisputesCulpritError.CULPRITKEYNOTINK);
    }

    // check culprit signatures
    const checkCulpritSignatures = this.elements.every((culprit) =>
      culprit.isSignatureValid(),
    );
    if (!checkCulpritSignatures) {
      return err(DisputesCulpritError.CULPRITSIGNATURESWRONG);
    }

    // enforce culprit are ordered by key
    // $(0.7.1 - 10.8)
    if (this.elements.length > 0) {
      for (let i = 1; i < this.elements.length; i++) {
        const [prev, curr] = [this.elements[i - 1], this.elements[i]];
        if (compareUint8Arrays(prev.key, curr.key) >= 0) {
          return err(
            DisputesCulpritError.CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY,
          );
        }
      }
    }

    const negativeVerdicts = deps.bold_v.filter(
      (v) => v.votes === VerdictVoteKind.ZERO,
    );

    // ensure any negative verdicts have at least 2 in cuprit
    // $(0.7.1 - 10.14)
    if (
      false ===
      negativeVerdicts.every((v) => {
        if (
          this.elements.filter(
            (c) => compareUint8Arrays(c.target, v.reportHash) === 0,
          ).length < 2
        ) {
          return false;
        }
        return true;
      })
    ) {
      return err(DisputesCulpritError.NEGATIVE_VERDICTS_NOT_IN_CULPRIT);
    }

    return ok(toTagged(this));
  }
}

export enum DisputesCulpritError {
  CULPRITKEYNOTINK = "CULPRITKEYNOTINK",
  CULPRITSIGNATURESWRONG = "CULPRITSIGNATURESWRONG",
  CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY = "CULPRIT_NOT_ORDERED_BY_ED25519_PUBLIC_KEY",
  NEGATIVE_VERDICTS_NOT_IN_CULPRIT = "NEGATIVE_VERDICTS_NOT_IN_CULPRIT",
}
