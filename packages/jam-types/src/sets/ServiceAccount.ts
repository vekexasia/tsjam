import {
  Balance,
  CodeHash,
  Gas,
  Hash,
  ServiceIndex,
  StateKey,
  Tagged,
  UpToSeq,
  u32,
  u64,
} from "@/genericTypes";
import { PVMProgramCode } from "@/pvm/PVMProgramCode";
import { Slot } from "@/Slot";

export interface IServiceAccountStorage {
  delete(key: Uint8Array): boolean;

  has(key: Uint8Array): boolean;

  get(key: Uint8Array): Uint8Array | undefined;

  set(key: Uint8Array, value: Uint8Array): void;

  entries(): IterableIterator<[StateKey, Uint8Array]>;

  readonly size: number;

  /**
   * The octects part of the service account that is in regard of the storage
   * it should compute the second half of formula in
   * $(0.7.1 - 9.8)
   */
  readonly octets: u64;
}

/**
 * `A` set in the graypaper
 * The analogous to a Smart Contract in ETH.
 * $(0.7.1 - 9.3)
 */
export interface ServiceAccount {
  /**
   * `s` - key value storage. It is set from service accumulation
   */
  storage: IServiceAccountStorage;

  /**
   * `bold_p` - designed to be queried in core.
   */
  preimages: Map<Hash, Uint8Array>;

  /**
   * `l` - preimage lookup dictionaries (hash, preimageLength) =&gt; Array of up to 3 timeslot indexes<br>
   * if there is no item for a given hash, it means that the preimage is not known<br>
   * if there is 1 item, then it means that the preimage is available since that timeslot<br>
   * if there are 2 items, then it was available but now it's not since the 2nd timeslot<br>
   * if there are 3 items, then its available since [2] no but in the past was not available[1] after being available[0]<br>
   * once all three elements are valued. we remove the first 2 only after a certain period has passed (to be defined)
   */
  requests: Map<Hash, Map<Tagged<u32, "length">, UpToSeq<Slot, 3>>>;

  /**
   * `f`
   */
  gratis: Balance;

  /**
   * `c` - code hash
   */
  codeHash: CodeHash;

  /**
   * `b` - balance
   */
  balance: Balance;

  /**
   * `g` - gas
   */
  minAccGas: Gas;

  /**
   * `m` - minimum gas for the on_initialize method
   */
  minMemoGas: Gas;

  /**
   * `r` - creation slot
   */
  created: Slot;

  /**
   * `a` - last accumulation slot
   */
  lastAcc: Slot;

  /**
   * `p`
   */
  parent: ServiceIndex;

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
  /**
   * `m`
   */
  metadata(): Uint8Array | undefined;

  /**
   * `c`
   */
  code(): PVMProgramCode | undefined;
}
