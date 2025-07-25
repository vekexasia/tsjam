import { SeqOfLength, u32 } from "@/genericTypes.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";

/**
 * `π`
 * $(0.7.0 - 13.2)
 * [0] is `πV`
 * [1] is `πL`
 */
export type ValidatorStatistics = {
  /**
   * `πV`
   */
  accumulator: ValidatorStatisticsCollection;
  /**
   * `πL`
   */
  previous: ValidatorStatisticsCollection;
};

export type ValidatorStatisticsCollection = {
  elements: SeqOfLength<SingleValidatorStatistics, typeof NUMBER_OF_VALIDATORS>;
};

/**
 * data types (u32) is given by the codec
 */
export type SingleValidatorStatistics = {
  /**
   * `b` - the blocks produced by the validator
   */
  blocks: u32;
  /**
   * `t` - The number of tickets introduced by the validator
   */
  tickets: u32;
  /**
   * `p` - The number of preimages introduced by the validator
   */
  preimageCount: u32;
  /**
   * `d` - The total number of octets across all preimages introduced by the validator
   */
  preimageSize: u32;
  /**
   * `g` - The number of reports guaranteed by the validator
   */
  guarantees: u32;
  /**
   * `a` The number of availability assurances made by the validator
   */
  assurances: u32;
};
