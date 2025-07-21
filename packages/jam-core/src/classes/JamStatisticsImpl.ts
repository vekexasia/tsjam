import {
  BaseJamCodecable,
  binaryCodec,
  buildGenericKeyValueCodec,
  codec,
  E_int,
  JamCodecable,
  jsonCodec,
  MapJSONCodec,
  NumberJSONCodec,
  sequenceCodec,
} from "@tsjam/codec";
import { CORES } from "@tsjam/constants";
import {
  JamStatistics,
  SeqOfLength,
  ServiceIndex,
  SingleServiceStatistics,
} from "@tsjam/types";
import { SingleCoreStatisticsImpl } from "./SingleCoreStatisticsImpl";
import { ValidatorStatisticsImpl } from "./ValidatorStatisticsImpl";
import { SingleServiceStatisticsImpl } from "./SingleServiceStatisticsImpl";

@JamCodecable()
export class JamStatisticsImpl
  extends BaseJamCodecable
  implements JamStatistics
{
  @codec(ValidatorStatisticsImpl)
  validators!: ValidatorStatisticsImpl;

  /**
   * `πC`
   */
  @sequenceCodec(CORES, SingleCoreStatisticsImpl)
  cores!: SeqOfLength<SingleCoreStatisticsImpl, typeof CORES>;

  /**
   * `πS`
   */

  @jsonCodec(
    MapJSONCodec(
      { key: "id", value: "record" },
      NumberJSONCodec(),
      SingleServiceStatisticsImpl,
    ),
  )
  @binaryCodec(
    buildGenericKeyValueCodec(
      E_int(),
      SingleServiceStatisticsImpl,
      (a, b) => a - b,
    ),
  )
  services!: Map<ServiceIndex, SingleServiceStatisticsImpl>;
}
