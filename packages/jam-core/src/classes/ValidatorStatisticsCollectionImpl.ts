import { SeqOfLength, ValidatorStatisticsCollection } from "@tsjam/types";
import { SingleValidatorStatisticsImpl } from "./SingleValidatorStatisticsImpl";
import { BaseJamCodecable, JamCodecable, sequenceCodec } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { ConditionalExcept } from "type-fest";

@JamCodecable()
export class ValidatorStatisticsCollectionImpl
  extends BaseJamCodecable
  implements ValidatorStatisticsCollection
{
  @sequenceCodec(NUMBER_OF_VALIDATORS, SingleValidatorStatisticsImpl)
  elements!: SeqOfLength<
    SingleValidatorStatisticsImpl,
    typeof NUMBER_OF_VALIDATORS
  >;
  constructor(
    config: ConditionalExcept<ValidatorStatisticsCollectionImpl, Function>,
  ) {
    super();
    Object.assign(this, config);
  }
}
