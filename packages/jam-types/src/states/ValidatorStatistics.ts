import { SeqOfLength } from "@/genericTypes.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";

/**
 * `π`
 * (13.1 - 0.5.0)
 * [0] is the accumulator,
 * [1] is the previous epoch's statistics
 */
export type ValidatorStatistics = SeqOfLength<
  SeqOfLength<SingleValidatorStatistics, typeof NUMBER_OF_VALIDATORS>,
  2
>;

export type SingleValidatorStatistics = {
  /**
   * `b`
   */
  blocksProduced: number;
  /**
   * `t`
   */
  ticketsIntroduced: number;
  /**
   * `p`
   */
  preimagesIntroduced: number;
  /**
   * `d`
   */
  totalOctetsIntroduced: number;
  /**
   * `g`
   */
  guaranteedReports: number;
  /**
   * `a`
   */
  availabilityAssurances: number;
};
