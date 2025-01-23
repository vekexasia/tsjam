import { SeqOfLength, u32 } from "@/genericTypes.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";

/**
 * `π`
 * $(0.5.4 - 13.1)
 * [0] is the accumulator,
 * [1] is the previous epoch's statistics
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
