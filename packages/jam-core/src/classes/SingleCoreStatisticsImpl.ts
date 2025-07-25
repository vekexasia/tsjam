import {
  BaseJamCodecable,
  eBigIntCodec,
  eIntCodec,
  JamCodecable,
} from "@tsjam/codec";
import { Gas, SingleCoreStatistics, u16, u32 } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

@JamCodecable()
export class SingleCoreStatisticsImpl
  extends BaseJamCodecable
  implements SingleCoreStatistics
{
  /**
   * `d`
   * Amount of bytes which are placed into either Audits or Segments DA.
   * This includes the work-bundle (including all extrinsics and imports) as well as all
   * (exported) segments.
   */
  @eIntCodec()
  daLoad!: u32;

  /**
   * `p`
   * Number of validators with formed super-majority for assurance.
   */
  @eIntCodec()
  popularity!: u16;

  /**
   * `i`
   * Number of segments imported from DA made by core for reported work..
   */
  @eIntCodec()
  importCount!: u16;

  /**
   * `e`
   * Number of segments exported into DA made by core for reported work.
   */
  @eIntCodec()
  exportCount!: u16;

  /**
   * `z`
   * Total size of extrinsic used by core for reported work.
   */
  @eIntCodec()
  extrinsicSize!: u32;

  /**
   * `x`
   * Total number of extrinsic used by core for reported work.
   */
  @eIntCodec()
  extrinsicCount!: u16;

  /**
   * `l`
   * Thw work-bundle size. This is the size of data being placed into audits DA by the core.
   */
  @eIntCodec()
  bundleSize!: u32;

  /**
   * `u`
   * Total gas consumed by core for reported work. includes all refinement and authorizations.
   */
  @eBigIntCodec()
  gasUsed!: Gas;

  constructor(config: ConditionalExcept<SingleCoreStatisticsImpl, Function>) {
    super();
    Object.assign(this, config);
  }
}
