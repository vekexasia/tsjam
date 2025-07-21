import { BaseJamCodecable, JamCodecable, sequenceCodec } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { SeqOfLength, Validators } from "@tsjam/types";
import { ValidatorDataImpl } from "./ValidatorDataImpl";

@JamCodecable()
export class ValidatorsImpl extends BaseJamCodecable implements Validators {
  @sequenceCodec(NUMBER_OF_VALIDATORS, ValidatorDataImpl)
  elements!: SeqOfLength<ValidatorDataImpl, typeof NUMBER_OF_VALIDATORS>;
}
