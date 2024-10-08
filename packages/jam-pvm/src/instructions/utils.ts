import {
  PVMIxExecutionError,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModRegister,
  RegularPVMExitReason,
  u32,
  u64,
} from "@tsjam/types";

export class MemoryUnreadable extends PVMIxExecutionError {
  constructor(location: u32, amount: number) {
    super(
      [],
      RegularPVMExitReason.Panic,
      `memory @${location}:-${amount} is not readable`,
    );
  }
}

export const IxMod = {
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
  w0: (value: number) => IxMod.reg(0, value),
  w1: (value: number) => IxMod.reg(1, value),
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
