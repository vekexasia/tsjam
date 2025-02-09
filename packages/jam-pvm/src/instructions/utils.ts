import {
  Gas,
  PVMExitHaltMod,
  PVMExitOutOfGasMod,
  PVMExitPanicMod,
  PVMIxExecutionError,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
  RegisterValue,
  RegularPVMExitReason,
  u32,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
import assert from "node:assert";

export const X_fn = (n: bigint) => (x: bigint) =>
  x + (x / 2n ** (8n * n - 1n)) * (2n ** 64n - 2n ** (8n * n));
export const X_4 = X_fn(4n);
export const X_8 = X_fn(8n);

/**
 * page fault
 */
export class MemoryUnreadable extends PVMIxExecutionError {
  constructor(location: u32, amount: number) {
    super(
      [],
      {
        type: "page-fault",
        memoryLocationIn: location,
      },
      `memory @${location}:-${amount} is not readable`,
      true, // account Trap gas cost
    );
  }
}

export const IxMod = {
  ip: (value: number): PVMSingleModPointer => ({
    type: "ip",
    data: toTagged(value),
  }),
  skip: (ip: u32, amont: number): PVMSingleModPointer => ({
    type: "ip",
    data: toTagged(ip + amont),
  }),
  gas: (value: bigint): PVMSingleModGas => ({
    type: "gas",
    data: value as Gas,
  }),
  reg: <T extends number>(
    register: T,
    value: number | bigint,
  ): PVMSingleModRegister<T> => {
    assert(register >= 0 && register < 13, `${register} not in bounds`);
    return {
      type: "register",
      data: {
        index: register,
        value: BigInt(value) as RegisterValue,
      },
    };
  },
  w7: (value: number | bigint) => IxMod.reg(7, value),
  w8: (value: number | bigint) => IxMod.reg(8, value),
  memory: (from: number | bigint, data: Uint8Array): PVMSingleModMemory => ({
    type: "memory",
    data: {
      from: Number(from) as u32,
      data,
    },
  }),
  outOfGas: (): PVMExitOutOfGasMod => ({
    type: "exit",
    data: RegularPVMExitReason.OutOfGas,
  }),
  halt: (): PVMExitHaltMod => ({
    type: "exit",
    data: RegularPVMExitReason.Halt,
  }),
  panic: (): PVMExitPanicMod => ({
    type: "exit",
    data: RegularPVMExitReason.Panic,
  }),
  obj: <T>(data: T): PVMSingleModObject<T> => ({
    type: "object",
    data,
  }),
};
