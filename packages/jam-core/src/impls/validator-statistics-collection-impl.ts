import { BaseJamCodecable, JamCodecable, sequenceCodec } from "@tsjam/codec";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";
import { SeqOfLength, ValidatorStatisticsCollection } from "@tsjam/types";
import { SingleValidatorStatisticsImpl } from "./single-validator-statistics-impl";

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
  constructor(elements?: SingleValidatorStatisticsImpl[]) {
    super();
    if (elements) {
      this.elements = <
        SeqOfLength<SingleValidatorStatisticsImpl, typeof NUMBER_OF_VALIDATORS>
      >elements;
    }
  }

  static newEmpty() {
    return new ValidatorStatisticsCollectionImpl(
      Array.from({ length: NUMBER_OF_VALIDATORS }, () =>
        SingleValidatorStatisticsImpl.newEmpty(),
      ),
    );
  }
}
