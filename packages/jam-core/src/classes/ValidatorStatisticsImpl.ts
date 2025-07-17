import { BaseJamCodecable, codec, JamCodecable } from "@tsjam/codec";
import { ValidatorStatistics } from "@tsjam/types";
import { SingleValidatorStatisticsImpl } from "./SingleValidatorStatisticsImpl";

/**
 * data types (u32) is given by the codec
 */
@JamCodecable()
export class ValidatorStatisticsImpl
  extends BaseJamCodecable
  implements ValidatorStatistics
{
  /**
   * `πV`
   */
  @codec(SingleValidatorStatisticsImpl)
  previous!: SingleValidatorStatisticsImpl;

  /**
   * `πL`
   */
  @codec(SingleValidatorStatisticsImpl)
  accumulator!: SingleValidatorStatisticsImpl;
}
