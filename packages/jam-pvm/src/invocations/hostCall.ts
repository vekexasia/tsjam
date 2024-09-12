import { SeqOfLength, i64, u32, u64 } from "@vekexasia/jam-types";
import { PVMMemory } from "@/pvmMemory.js";

export type HostCallExecutor<T> = <T>(input: {
  hostCall: any;
  gas: u64;
  registers: SeqOfLength<u32, 13>;
  memory: PVMMemory;
  out: T;
}) =>
  | { pageFaultAddress: u32 }
  | {
      remainingGas: i64;
      registers: SeqOfLength<u32, 13>;
      memory: PVMMemory;
      output: T;
    };

export type HostCallInput<T> = {
  /**
   * `c`
   */
  programCode: Uint8Array;
  /**
   * `ı`
   */
  instructionPointer: number;
  /**
   * `ξ`
   */
  gas: u64;
  /**
   * `ω`
   */
  registers: SeqOfLength<u32, 13>;
  /**
   * `μ`
   */
  memory: PVMMemory;
  /**
   * `f`
   */
  function: HostCallExecutor<T>;
  /**
   * `x`
   */
  defaultOut: T;
};
export type HostCallOutput<T> = {
  remainingGas: i64;
  registers: SeqOfLength<u32, 13>;
  memory: PVMMemory;
  output: T;
};

export const hostCallInvocation = <T>(
  input: HostCallInput<T>,
): HostCallOutput<T> => {
  throw new Error("Not implemented");
};
