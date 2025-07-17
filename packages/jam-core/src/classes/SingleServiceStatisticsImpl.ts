import {
  BaseJamCodecable,
  buildGenericKeyValueCodec,
  buildKeyValueCodec,
  E_sub_int,
  eIntCodec,
  eSubBigIntCodec,
  JamCodec,
  JSONCodec,
  MapJSONCodec,
  NumberJSONCodec,
} from "@tsjam/codec";
import {
  Gas,
  ServiceIndex,
  SingleServiceStatistics,
  u16,
  u32,
} from "@tsjam/types";

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

  /**
   * `t`
   */
  @eIntCodec()
  transfersCount!: u32;
  @eSubBigIntCodec(8)
  transfersGasUsed!: Gas;

  static mapCodec: JamCodec<Map<ServiceIndex, SingleServiceStatisticsImpl>> &
    JSONCodec<Map<ServiceIndex, SingleServiceStatisticsImpl>>;
}

SingleServiceStatisticsImpl.mapCodec = {
  ...buildGenericKeyValueCodec(
    E_sub_int<ServiceIndex>(4),
    SingleServiceStatisticsImpl,
    (a, b) => a - b,
  ),
  ...MapJSONCodec(
    { key: "id", value: "record" },
    NumberJSONCodec(),
    <JSONCodec<SingleServiceStatisticsImpl>>SingleServiceStatisticsImpl,
  ),
};
