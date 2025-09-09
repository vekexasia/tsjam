import {
  Balance,
  CodeHash,
  Gas,
  Hash,
  ServiceIndex,
  UpToSeq,
  u32,
  u64,
} from "@/generic-types";
import { PVMProgramCode } from "@/pvm/pvm-program-code";
import { Slot } from "@/slot";

export interface IServiceAccountStorage {
  has(key: Buffer): boolean;

  delete(key: Buffer): boolean;

  get(key: Buffer): Buffer | undefined;

  set(key: Buffer, value: Buffer): void;
}

export interface IServiceAccountRequests {
  has(key: Hash, length: u32): boolean;

  delete(key: Hash, length: u32): boolean;

  get(key: Hash, length: u32): UpToSeq<Slot, 3> | undefined;

  set(key: Hash, length: u32, value: UpToSeq<Slot, 3>): void;
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
  requests: IServiceAccountRequests;

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
