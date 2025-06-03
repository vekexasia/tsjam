import {
  CodeHash,
  Gas,
  Hash,
  ServiceIndex,
  Tagged,
  UpToSeq,
  u32,
  u64,
} from "@/genericTypes";

export interface IServiceAccountStorage {
  delete(key: Uint8Array): boolean;

  get(key: Uint8Array): Uint8Array;

  hasKey(key: Uint8Array): boolean;

  set(key: Uint8Array, value: Uint8Array): void;

  readonly size: number;
}

/**
 * `A` set in the graypaper
 * The analogous to a Smart Contract in ETH.
 * $(0.6.6 - 9.3)
 *  NOTE: there are some `virtual` elements such as
 * `bold_c` - actual code ap[ac] $(0.6.6 - 9.4)
 * $(0.6.4 - 9.8):
 * `i` - ∈ N232 = computed in `serviceAccountItemInStorage`
 * `o` - ∈ N264 = computed in `serviceAccountTotalOctets`
 * `t` - balance threshold  computed in `serviceAccountGasThreshold`
 */
export interface ServiceAccount {
  /**
   * `s` - key value storage. It is set from service accumulation
   */
  storage: IServiceAccountStorage;

  /**
   * `bold_p` - designed to be queried in core.
   */
  preimage_p: Map<Hash, Uint8Array>;

  /**
   * `l` - preimage lookup dictionaries (hash, preimageLength) =&gt; Array of up to 3 timeslot indexes<br>
   * if there is no item for a given hash, it means that the preimage is not known<br>
   * if there is 1 item, then it means that the preimage is available since that timeslot<br>
   * if there are 2 items, then it was available but now it's not since the 2nd timeslot<br>
   * if there are 3 items, then its available since [2] no but in the past was not available[1] after being available[0]<br>
   * once all three elements are valued. we remove the first 2 only after a certain period has passed (to be defined)
   */
  preimage_l: Map<Hash, Map<Tagged<u32, "length">, UpToSeq<u32, 3, "Nt">>>;

  /**
   * `f`
   */
  gratisStorageOffset: u64;

  /**
   * `c` - code hash
   */
  codeHash: CodeHash;

  /**
   * `b` - balance
   */
  balance: u64;

  /**
   * `g` - gas
   */
  minGasAccumulate: Gas;

  /**
   * `m` - minimum gas for the on_initialize method
   */
  minGasOnTransfer: Gas;

  /**
   * `r`
   */
  creationTimeSlot: u32;

  /**
   * `a`
   */
  lastAccumulationTimeSlot: u32;

  /**
   * `p`
   */
  parentService: ServiceIndex;

  //  NOTE: Virtual elements
  /**
   * `i`
   */
  itemInStorage(): u32;
  /**
   * `o`
   */
  totalOctets(): u64;

  /**
   * `t`
   */
  gasThreshold(): Gas;
}
