import {
  BaseJamCodecable,
  eIntCodec,
  eSubBigIntCodec,
  JamCodecable,
} from "@tsjam/codec";
import type { Gas, SingleServiceStatistics, u16, u32 } from "@tsjam/types";
import type { ConditionalExcept } from "type-fest";

@JamCodecable()
export class SingleServiceStatisticsImpl
  extends BaseJamCodecable
  implements SingleServiceStatistics
{
  /**
   * `p`
   */
  @eIntCodec("provided_count")
  providedCount!: u16;
  @eIntCodec("provided_size")
  providedSize!: u32;

  /**
   * `r`
   */
  @eIntCodec("refinement_count")
  refinementCount!: u32;
  @eSubBigIntCodec(8, "refinement_gas_used")
  refinementGasUsed!: Gas;

  /**
   * `i`
   */
  @eIntCodec("imports")
  importCount!: u32;

  /**
   * `x`
   */
  @eIntCodec("exports")
  extrinsicCount!: u32;

  /**
   * `z`
   */
  @eIntCodec("extrinsic_size")
  extrinsicSize!: u32;

  /**
   * `e`
   */
  @eIntCodec("extrinsic_count")
  exportCount!: u32;

  /**
   * `a`
   */
  @eIntCodec("accumulate_count")
  accumulateCount!: u32;
  @eSubBigIntCodec(8, "accumulate_gas_used")
  accumulateGasUsed!: Gas;

  constructor(
    config?: ConditionalExcept<SingleServiceStatisticsImpl, Function>,
  ) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }
}
