import { Gas, SeqOfLength, ServiceIndex, u16, u32 } from "@/genericTypes";
import { ValidatorStatistics } from "./ValidatorStatistics";
import { CORES } from "@tsjam/constants";

/**
 * $(0.7.0 - 13.1)
 */
export type JamStatistics = {
  validators: ValidatorStatistics;

  /**
   * `πC`
   */
  cores: CoreStatistics;

  /**
   * `πS`
   */
  services: ServicesStatistics;
};

export type CoreStatistics = {
  elements: SeqOfLength<SingleCoreStatistics, typeof CORES>;
};

export type ServicesStatistics = {
  elements: Map<ServiceIndex, SingleServiceStatistics>;
};
/**
 * $(0.7.0 - 13.6)
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
  importCount: u16;

  /**
   * `x`
   * Total number of extrinsic used by core for reported work.
   */
  extrinsicCount: u16;

  /**
   * `z`
   * Total size of extrinsic used by core for reported work.
   */
  extrinsicSize: u32;

  /**
   * `e`
   * Number of segments exported into DA made by core for reported work.
   */
  exportCount: u16;

  /**
   * `l`
   * Thw work-bundle size. This is the size of data being placed into audits DA by the core.
   */
  bundleSize: u32;

  /**
   * `u`
   * Total gas consumed by core for reported work. includes all refinement and authorizations.
   */
  gasUsed: Gas;
};

/**
 * $(0.7.0 - 13.7)
 */
export type SingleServiceStatistics = {
  /**
   * `p`
   */
  providedCount: u16;
  providedSize: u32;

  /**
   * `r`
   */
  refinementCount: u32;
  refinementGasUsed: Gas;

  /**
   * `i`
   */
  importCount: u32;

  /**
   * `x`
   */
  extrinsicCount: u32;

  /**
   * `z`
   */
  extrinsicSize: u32;

  /**
   * `e`
   */
  exportCount: u32;

  /**
   * `a`
   */
  accumulateCount: u32;
  accumulateGasUsed: Gas;

  /**
   * `t`
   */
  transfersCount: u32;
  transfersGasUsed: Gas;
};
