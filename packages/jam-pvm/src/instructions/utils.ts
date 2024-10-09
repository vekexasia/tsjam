import {
  PVMIxExecutionError,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
  PVMSingleSelfGas,
  RegularPVMExitReason,
  u32,
  u64,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export class MemoryUnreadable extends PVMIxExecutionError {
  constructor(location: u32, amount: number) {
    super(
      [],
      RegularPVMExitReason.Panic,
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
  selfGas: (): PVMSingleSelfGas => ({
    type: "self-gas",
    data: undefined,
  }),
  gas: (value: bigint): PVMSingleModGas => ({
    type: "gas",
    data: value as u64,
  }),
  reg: <T extends number>(
    register: T,
    value: number,
  ): PVMSingleModRegister<T> => {
    return {
      type: "register",
      data: {
        index: register,
        value: value as u32,
      },
    };
  },
  w7: (value: number) => IxMod.reg(7, value),
  w8: (value: number) => IxMod.reg(8, value),
  memory: (from: number, data: Uint8Array): PVMSingleModMemory => ({
    type: "memory",
    data: {
      from: from as u32,
      data,
    },
  }),
  obj: <T>(data: T): PVMSingleModObject<T> => ({
    type: "object",
    data,
  }),
};
