import { BaseJamCodecable, JamCodecable, sequenceCodec } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import {
  BandersnatchKey,
  ED25519PublicKey,
  Posterior,
  SeqOfLength,
  ValidatorData,
  Validators,
} from "@tsjam/types";
import { ValidatorDataImpl } from "./ValidatorDataImpl";
import assert from "assert";
import { ConditionalExcept } from "type-fest";
import { DisputesStateImpl } from "./DisputesStateImpl";
import { toTagged } from "@tsjam/utils";

@JamCodecable()
export class ValidatorsImpl extends BaseJamCodecable implements Validators {
  @sequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataImpl)
  elements!: SeqOfLength<ValidatorDataImpl, typeof NUMBER_OF_VALIDATORS>;

  constructor(config: ConditionalExcept<ValidatorsImpl, Function>) {
    super();
    Object.assign(this, config);
  }

  at(index: number): ValidatorDataImpl {
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
          if (p_offenders.has(v.ed25519.bigint)) {
            return new ValidatorDataImpl({
              banderSnatch: new Uint8Array(32).fill(0) as BandersnatchKey,
              ed25519: <ED25519PublicKey>{
                buf: new Uint8Array(32).fill(
                  0,
                ) as ValidatorData["ed25519"]["buf"],
                bigint: toTagged(0n),
              },
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
