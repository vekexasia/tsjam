import { Gas, SeqOfLength, ServiceIndex, u16, u32 } from "@/genericTypes";
import { ValidatorStatistics } from "./ValidatorStatistics";
import { CORES } from "@tsjam/constants";

export type JamStatistics = {
  validator: ValidatorStatistics;

  /**
   * `πS`
   */
  core: SeqOfLength<SingleCoreStatistics, typeof CORES>;

  /**
   * `πS`
   */
  service: Map<ServiceIndex, SingleServiceStatistics>;
};

/**
 * $(0.6.4 - 13.6)
 */
export type SingleCoreStatistics = {
  /**
   * `d`
   */
  daLoad: u32;

  /**
   * `p`
   */
  popularity: u16;

  /**
   * `i`
   */
  imports: u16;

  /**
   * `e`
   */
  extrinsicCount: u16;

  /**
   * `z`
   */
  extrinsicSize: u32;

  /**
   * `x`
   */
  exports: u16;

  /**
   * `b`
   */
  bundleSize: u32;

  /**
   * `u`
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
  imports: u16;

  /**
   * `e`
   */
  extrinsicCount: u16;

  /**
   * `z`
   */
  extrinsicSize: u32;

  /**
   * `x`
   */
  exports: u16;

  /**
   * `a`
   */
  accumulate: { count: u32; usedGas: Gas };

  /**
   * `t`
   */
  transfers: { count: u32; usedGas: Gas };
};
