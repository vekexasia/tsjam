import { Hash } from "@/genericTypes";

/**
 * identified by `T` set
 * $(0.7.1 - 6.6)
 */
export type Ticket = {
  /**
   * `y`
   */
  id: Hash;
  /**
   * `e`
   */
  attempt: 0 | 1;
};
