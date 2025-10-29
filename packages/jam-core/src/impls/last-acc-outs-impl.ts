import { HashCodec } from "@/codecs/misc-codecs";
import { wellBalancedBinaryMerkleRoot } from "@/merklization/binary";
import {
  BaseJamCodecable,
  codec,
  eSubIntCodec,
  JamCodecable,
  lengthDiscriminatedCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import type { Hash, LastAccOuts, ServiceIndex } from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

@JamCodecable()
export class SingleAccOutImpl extends BaseJamCodecable {
  @eSubIntCodec(4)
  serviceIndex!: ServiceIndex;
  @codec(HashCodec)
  accumulationResult!: Hash;

  constructor(config: ConditionalExcept<SingleAccOutImpl, Function>) {
    super();
    Object.assign(this, config);
  }
}
/**
 * `θ` - `\lastaccout`
 * Also implements `\servouts` or `B` defined in
 * $(0.7.1 - 12.17)
 * $(0.7.1 - 7.4)
 *
 * Codec is C(16) in $(0.7.1 - D.2)
 */
@JamCodecable()
export class LastAccOutsImpl extends BaseJamCodecable implements LastAccOuts {
  @lengthDiscriminatedCodec(SingleAccOutImpl, SINGLE_ELEMENT_CLASS)
  elements!: Array<SingleAccOutImpl>;

  constructor(elements?: Array<SingleAccOutImpl>) {
    super();
    if (typeof elements !== "undefined") {
      this.elements = elements;
    } else {
      this.elements = [];
    }
  }

  /**
   * Adds a new element to the last accumulation outputs.
   * @param serviceIndex - The index of the service.
   * @param accumulationResult - The hash of the accumulation result. it's coming from the yield field
   */
  add(serviceIndex: ServiceIndex, accumulationResult: Hash): void {
    this.elements.push(
      new SingleAccOutImpl({ serviceIndex, accumulationResult }),
    );
    this.elements.sort((a, b) => a.serviceIndex - b.serviceIndex);
  }

  static union(a: LastAccOutsImpl, b: LastAccOutsImpl): LastAccOutsImpl {
    const els = [...a.elements];
    b.elements.forEach((elB) => {
      if (
        !els.find(
          (elA) =>
            elA.serviceIndex === elB.serviceIndex &&
            Buffer.compare(elA.accumulationResult, elB.accumulationResult) ===
              0,
        )
      ) {
        els.push(elB);
      }
    });
    els.sort((a, b) => a.serviceIndex - b.serviceIndex);
    return new LastAccOutsImpl(els);
  }

  static newEmpty(): LastAccOutsImpl {
    return new LastAccOutsImpl([]);
  }

  /**
   * the Root of the accumulation outputs is currently unused.
   * here to check against test and in possible future usage
   */
  merkleRoot() {
    return wellBalancedBinaryMerkleRoot(
      [...this.elements].map((entry) => entry.toBinary()),
      Hashing.keccak256,
    );
  }
}
