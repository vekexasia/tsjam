import { Hash, OpaqueHash } from "@/genericTypes";

/**
 * identified by `C` set
 */
export type Ticket = {
  /**
   * `y`
   */
  identifier: Hash;
  /**
   * `r`
   */
  entryIndex: 0 | 1;
};

export type TicketIdentifier = {
  /**
   * `y`
   */
  id: OpaqueHash;
  /**
   * `r`
   * either the first entry or the second entry ( a validator can have only 2 ticket entries per epoch )
   */
  attempt: 0 | 1;
};
