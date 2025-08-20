import {
  BaseJamCodecable,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  Posterior,
  SeqOfLength,
  ValidatorIndex,
  Validators,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "assert";
import { ConditionalExcept } from "type-fest";
import type { DisputesStateImpl } from "./disputes-state-impl";
import { ValidatorDataImpl } from "./validator-data-impl";

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
            return ValidatorDataImpl.newEmpty();
          }
          return v;
        }),
      ),
    });
  }

  static newEmpty() {
    return new ValidatorsImpl({
      elements: <ValidatorsImpl["elements"]>(
        Array.from({ length: NUMBER_OF_VALIDATORS }, () =>
          ValidatorDataImpl.newEmpty(),
        )
      ),
    });
  }
}
