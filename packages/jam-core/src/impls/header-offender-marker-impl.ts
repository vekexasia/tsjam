import {
  BaseJamCodecable,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
  xBytesCodec,
} from "@tsjam/codec";
import { ED25519PublicKey, OffendersMarker, Validated } from "@tsjam/types";
import { DisputeExtrinsicImpl } from "./extrinsics/disputes";
import { compareUint8Arrays } from "uint8array-extras";

/**
 * `HO`
 */
@JamCodecable()
export class HeaderOffenderMarkerImpl
  extends BaseJamCodecable
  implements OffendersMarker
{
  @lengthDiscriminatedCodec(xBytesCodec(32), SINGLE_ELEMENT_CLASS)
  elements!: ED25519PublicKey[];
  constructor(elements: ED25519PublicKey[] = []) {
    super();
    this.elements = elements;
  }

  /**
   * $(0.7.1 - 10.20)
   */
  static build(disputesExtrinsic: Validated<DisputeExtrinsicImpl>) {
    return new HeaderOffenderMarkerImpl([
      ...disputesExtrinsic.culprits.elements.map((c) => c.key),
      ...disputesExtrinsic.faults.elements.map((f) => f.key),
    ]);
  }

  checkValidity(
    disputesExtrinsic: Validated<DisputeExtrinsicImpl>,
  ): this is Validated<HeaderOffenderMarkerImpl> {
    const target = HeaderOffenderMarkerImpl.build(disputesExtrinsic);
    if (this.elements.length !== target.elements.length) {
      return false;
    }
    for (let i = 0; i < this.elements.length; i++) {
      if (compareUint8Arrays(this.elements[i], target.elements[i]) !== 0) {
        return false;
      }
    }
    return true;
  }
}
