import {
  BaseJamCodecable,
  codec,
  JamCodecable,
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
  validators!: ValidatorStatisticsImpl;

  /**
   * `πC`
   */
  cores!: SeqOfLength<SingleCoreStatisticsImpl, typeof CORES>;

  /**
   * `πS`
   */
  services!: Map<ServiceIndex, SingleServiceStatisticsImpl>;
}
