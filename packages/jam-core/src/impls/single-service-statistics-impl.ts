import {
  BaseJamCodecable,
  eBigIntCodec,
  eIntCodec,
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
  @eBigIntCodec("refinement_gas_used")
  refinementGasUsed!: Gas;

  /**
   * `i`
   */
  @eIntCodec("imports")
  importCount!: u32;

  /**
   * `x`
   */
  @eIntCodec("extrinsic_count")
  extrinsicCount!: u32;

  /**
   * `z`
   */
  @eIntCodec("extrinsic_size")
  extrinsicSize!: u32;

  /**
   * `e`
   */
  @eIntCodec("exports")
  exportCount!: u32;

  /**
   * `a`
   */
  @eIntCodec("accumulate_count")
  accumulateCount!: u32;
  @eBigIntCodec("accumulate_gas_used")
  accumulateGasUsed!: Gas;

  constructor(
    config?: ConditionalExcept<SingleServiceStatisticsImpl, Function>,
  ) {
    super();
    if (typeof config !== "undefined") {
      Object.assign(this, config);
    }
  }

  static newEmpty(): SingleServiceStatisticsImpl {
    return new SingleServiceStatisticsImpl({
      providedCount: <u16>0,
      providedSize: <u32>0,
      refinementCount: <u32>0,
      refinementGasUsed: <Gas>0n,
      importCount: <u32>0,
      extrinsicCount: <u32>0,
      extrinsicSize: <u32>0,
      exportCount: <u32>0,
      accumulateCount: <u32>0,
      accumulateGasUsed: <Gas>0n,
    });
  }
}
