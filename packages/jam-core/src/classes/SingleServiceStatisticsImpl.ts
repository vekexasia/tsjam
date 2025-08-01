import {
  BaseJamCodecable,
  eIntCodec,
  eSubBigIntCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Gas, SingleServiceStatistics, u16, u32 } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

@JamCodecable()
export class SingleServiceStatisticsImpl
  extends BaseJamCodecable
  implements SingleServiceStatistics
{
  /**
   * `p`
   */
  @eIntCodec()
  providedCount!: u16;
  @eIntCodec()
  providedSize!: u32;

  /**
   * `r`
   */
  @eIntCodec()
  refinementCount!: u32;
  @eSubBigIntCodec(8)
  refinementGasUsed!: Gas;

  /**
   * `i`
   */
  @eIntCodec()
  importCount!: u32;

  /**
   * `x`
   */
  @eIntCodec()
  extrinsicCount!: u32;

  /**
   * `z`
   */
  @eIntCodec()
  extrinsicSize!: u32;

  /**
   * `e`
   */
  @eIntCodec()
  exportCount!: u32;

  /**
   * `a`
   */
  @eIntCodec()
  accumulateCount!: u32;
  @eSubBigIntCodec(8)
  accumulateGasUsed!: Gas;

  constructor(
    config: ConditionalExcept<SingleServiceStatisticsImpl, Function>,
  ) {
    super();
    Object.assign(this, config);
  }
}
