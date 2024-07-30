import { Hash, Tagged, u32, UpToSeq } from "@/genericTypes.js";

/**
 * The analogous to a Smart Contract in ETH.
 *
 */
export interface ServiceAccount {
  // should be a Dictionary in the form of Hash => Uint8Array
  storage: Map<Hash, Uint8Array>;
  // preimage lookup dictionaries in the form of Hash => Uint8Array
  preimage_p: Map<Hash, Uint8Array>;
  /**
   * preimage lookup dictionaries (hash, preimageLength) => Array of up to 3 timeslot indexes<br>
   * if there is no item for a given hash, it means that the preimage is not known<br>
   * if there is 1 item, then it means that the preimage is available since that timeslot<br>
   * if there are 2 items, then it was available but now it's not since the 2nd timeslot<br>
   * if there are 3 items, then its available since [2] no but in the past was not available[1] after being available[0]<br>
   * once all three elements are valued. we remove the first 2 only after a certain period has passed (to be defined)
   */
  preimage_l: Map<[Hash, Tagged<u32, "length">], UpToSeq<u32, 3, "Nt">>;
  // c code hash
  codeHash: Tagged<Hash, "code-hash">;
  // balance
  balance: bigint;
  // minimum gas for the accumulate method
  minGasAccumulate: bigint;
  // minimum gas for the on_transfer method
  minGasOnTransfer: bigint;
}

/**
 * It's identified as δ or delta in the graypaper
 *
 * It's a dictionary of service accounts
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
