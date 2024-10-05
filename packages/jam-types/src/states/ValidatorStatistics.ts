import { SeqOfLength } from "@/genericTypes.js";
import { NUMBER_OF_VALIDATORS } from "@tsjam/constants";

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
export type ValidatorStatistics = SeqOfLength<
  SeqOfLength<SingleValidatorStatistics, typeof NUMBER_OF_VALIDATORS>,
  2
>;
