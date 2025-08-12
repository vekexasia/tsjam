import {
  BaseJamCodecable,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  BandersnatchKey,
  ED25519PublicKey,
  Posterior,
  SeqOfLength,
  ValidatorData,
  ValidatorIndex,
  Validators,
} from "@tsjam/types";
import { ValidatorDataImpl } from "./validator-data-impl";
import assert from "assert";
import { ConditionalExcept } from "type-fest";
import { DisputesStateImpl } from "./disputes-state-impl";
import { toTagged } from "@tsjam/utils";

@JamCodecable()
export class ValidatorsImpl extends BaseJamCodecable implements Validators {
  @sequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataImpl, SINGLE_ELEMENT_CLASS)
  elements!: SeqOfLength<ValidatorDataImpl, typeof NUMBER_OF_VALIDATORS>;

  constructor(config?: ConditionalExcept<ValidatorsImpl, Function>) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    } else {
      this.elements = toTagged([] as ValidatorDataImpl[]);
    }
  }

  at(index: ValidatorIndex): ValidatorDataImpl {
    assert(index >= 0 && index < NUMBER_OF_VALIDATORS, "Index out of bounds");
    return this.elements[index];
  }

  /**
   * Phi function
   * returns a new instance of this where the validator keys which are not in ψ'o. nullify the validator keys which are in ψ'o
   * @see $(0.7.1 - 6.14)
   */
  phi(p_offenders: Posterior<DisputesStateImpl["offenders"]>) {
    return new ValidatorsImpl({
      elements: toTagged(
        this.elements.map((v) => {
          if (p_offenders.has(v.ed25519)) {
            return new ValidatorDataImpl({
              banderSnatch: new Uint8Array(32).fill(0) as BandersnatchKey,
              ed25519: <ED25519PublicKey>new Uint8Array(32).fill(0),
              blsKey: new Uint8Array(144).fill(0) as ValidatorData["blsKey"],
              metadata: new Uint8Array(128).fill(
                0,
              ) as ValidatorData["metadata"],
            });
          }
          return v;
        }),
      ),
    });
  }
}
