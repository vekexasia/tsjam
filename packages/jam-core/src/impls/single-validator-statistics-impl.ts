import { BaseJamCodecable, eSubIntCodec, JamCodecable } from "@tsjam/codec";
import { SingleValidatorStatistics, u32 } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

@JamCodecable()
export class SingleValidatorStatisticsImpl
  extends BaseJamCodecable
  implements SingleValidatorStatistics
{
  /**
   * `b` - the blocks produced by the validator
   */
  @eSubIntCodec(4)
  blocks!: u32;
  /**
   * `t` - The number of tickets introduced by the validator
   */
  @eSubIntCodec(4)
  tickets!: u32;
  /**
   * `p` - The number of preimages introduced by the validator
   */
  @eSubIntCodec(4)
  preimageCount!: u32;
  /**
   * `d` - The total number of octets across all preimages introduced by the validator
   */
  @eSubIntCodec(4)
  preimageSize!: u32;
  /**
   * `g` - The number of reports guaranteed by the validator
   */
  @eSubIntCodec(4)
  guarantees!: u32;
  /**
   * `a` The number of availability assurances made by the validator
   */
  @eSubIntCodec(4)
  assurances!: u32;

  constructor(
    config: ConditionalExcept<SingleValidatorStatisticsImpl, Function>,
  ) {
    super();
    Object.assign(this, config);
  }

  static newEmpty() {
    return new SingleValidatorStatisticsImpl({
      blocks: <u32>0,
      tickets: <u32>0,
      preimageCount: <u32>0,
      preimageSize: <u32>0,
      guarantees: <u32>0,
      assurances: <u32>0,
    });
  }
}
