import { Hash } from "@/genericTypes";

/**
 * identified by `C` set
 */
export type Ticket = {
  /**
   * `y
   */
  identifier: Hash;
  /**
   * `r`
   */
  entryIndex: 0 | 1;
};
