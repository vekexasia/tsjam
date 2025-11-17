import {
  BaseJamCodecable,
  JamCodecable,
  sequenceCodec,
  SINGLE_ELEMENT_CLASS,
} from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import type {
  CoreIndex,
  ED25519PublicKey,
  Posterior,
  SeqOfLength,
  ValidatorIndex,
  Validators,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import { err, ok, Result } from "neverthrow";
import type { ConditionalExcept } from "type-fest";
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

  at(index: ValidatorIndex): Result<ValidatorDataImpl, "invalid_index"> {
    if (index < 0 || index >= NUMBER_OF_VALIDATORS) {
      return err("invalid_index");
    }
    return ok(this.elements[index]);
  }

  /**
   * computes the shard that the given validator is assigned to
   * to be used when assurers needs to ask for their piece of data
   * or guarantors need to know who to ask for data
   */
  shardOf(v: ValidatorIndex, core: CoreIndex): number {
    // recovery threshold
    const R = 2;
    return (core * R + v) % NUMBER_OF_VALIDATORS;
  }

  /**
   * finds the index of the given ed25519 public key in the validator set
   * returns undefined if not found
   */
  indexOfEd25519(ed25519: ED25519PublicKey): ValidatorIndex | undefined {
    for (let i = <ValidatorIndex>0; i < NUMBER_OF_VALIDATORS; i++) {
      if (Buffer.compare(this.elements[i].ed25519, ed25519) === 0) {
        return i;
      }
    }
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
