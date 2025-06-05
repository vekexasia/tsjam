import { Gas, SeqOfLength, ServiceIndex, u16, u32 } from "@/genericTypes";
import { ValidatorStatistics } from "./ValidatorStatistics";
import { CORES } from "@tsjam/constants";

export type JamStatistics = {
  validators: ValidatorStatistics;

  /**
   * `πS`
   */
  cores: SeqOfLength<SingleCoreStatistics, typeof CORES>;

  /**
   * `πS`
   */
  services: Map<ServiceIndex, SingleServiceStatistics>;
};

/**
 * $(0.6.4 - 13.6)
 */
export type SingleCoreStatistics = {
  /**
   * `d`
   * Amount of bytes which are placed into either Audits or Segments DA.
   * This includes the work-bundle (including all extrinsics and imports) as well as all
   * (exported) segments.
   */
  daLoad: u32;

  /**
   * `p`
   * Number of validators with formed super-majority for assurance.
   */
  popularity: u16;

  /**
   * `i`
   * Number of segments imported from DA made by core for reported work..
   */
  imports: u16;

  /**
   * `e`
   * Total number of extrinsic used by core for reported work.
   */
  extrinsicCount: u16;

  /**
   * `z`
   * Total size of extrinsic used by core for reported work.
   */
  extrinsicSize: u32;

  /**
   * `x`
   * Number of segments exported into DA made by core for reported work.
   */
  exports: u16;

  /**
   * `b`
   * Thw work-bundle size. This is the size of data being placed into audits DA by the core.
   */
  bundleSize: u32;

  /**
   * `u`
   * Total gas consumed by core for reported work. includes all refinement and authorizations.
   */
  usedGas: Gas;
};

/**
 * $(0.6.4 - 13.7)
 */
export type SingleServiceStatistics = {
  /**
   * `p`
   */
  provided: { count: u16; size: u32 };

  /**
   * `r`
   */
  refinement: { count: u32; usedGas: Gas };

  /**
   * `i`
   */
  imports: u32;

  /**
   * `e`
   */
  extrinsicCount: u32;

  /**
   * `z`
   */
  extrinsicSize: u32;

  /**
   * `x`
   */
  exports: u32;

  /**
   * `a`
   */
  accumulate: { count: u32; usedGas: Gas };

  /**
   * `t`
   */
  transfers: { count: u32; usedGas: Gas };
};
