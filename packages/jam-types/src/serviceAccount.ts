import { Hash, Tagged, UpToSeq, u32 } from "@/genericTypes.js";

/**
 * `A` set in the graypaper
 * The analogous to a Smart Contract in ETH.
 * (89) in the graypaper
 */
export interface ServiceAccount {
  /**
   * `s` - should be a storage Dictionary in the form of Hash => Uint8Array
   */
  storage: Map<Hash, Uint8Array>;

  /**
   * `p` - preimage lookup dictionaries in the form of Hash => Uint8Array
   */
  preimage_p: Map<Hash, Uint8Array>;

  /**
   * `l` - preimage lookup dictionaries (hash, preimageLength) => Array of up to 3 timeslot indexes<br>
   * if there is no item for a given hash, it means that the preimage is not known<br>
   * if there is 1 item, then it means that the preimage is available since that timeslot<br>
   * if there are 2 items, then it was available but now it's not since the 2nd timeslot<br>
   * if there are 3 items, then its available since [2] no but in the past was not available[1] after being available[0]<br>
   * once all three elements are valued. we remove the first 2 only after a certain period has passed (to be defined)
   */
  preimage_l: Map<[Hash, Tagged<u32, "length">], UpToSeq<u32, 3, "Nt">>;
  /**
   * `c` - code hash
   */
  codeHash: Tagged<Hash, "code-hash">;
  /**
   * `b` - balance
   */
  balance: bigint;
  /**
   * `g` - gas
   */
  minGasAccumulate: bigint;
  /**
   * `m` - minimum gas for the on_initialize method
   */
  minGasOnTransfer: bigint;
}

/**
 * It's identified as δ or delta in the graypaper
 *
 * It's a dictionary of service accounts
 * (88) in the graypaper
 */
export type ServiceAccountState = Record<
  ServiceAccountIdentifier,
  ServiceAccount
>;

// also known as service index
export type ServiceAccountIdentifier = Tagged<
  u32,
  "service-account-identifier"
>;
