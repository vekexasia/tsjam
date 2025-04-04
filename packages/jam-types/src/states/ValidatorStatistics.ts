import { SeqOfLength, u32 } from "@/genericTypes.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";

/**
 * `π`
 * $(0.6.4 - 13.2)
 * [0] is `πV`
 * [1] is `πL`
 */
export type ValidatorStatistics = SeqOfLength<
  SeqOfLength<SingleValidatorStatistics, typeof NUMBER_OF_VALIDATORS>,
  2
>;

/**
 * data types (u32) is given by the codec
 */
export type SingleValidatorStatistics = {
  /**
   * `b`
   */
  blocksProduced: u32;
  /**
   * `t`
   */
  ticketsIntroduced: u32;
  /**
   * `p`
   */
  preimagesIntroduced: u32;
  /**
   * `d`
   */
  totalOctetsIntroduced: u32;
  /**
   * `g`
   */
  guaranteedReports: u32;
  /**
   * `a`
   */
  availabilityAssurances: u32;
};
