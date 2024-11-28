import {
  Gas,
  PVMIxExecutionError,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
  PVMSingleSelfGas,
  RegisterValue,
  RegularPVMExitReason,
  u32,
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
  gas: (value: Gas): PVMSingleModGas => ({
    type: "gas",
    data: value,
  }),
  reg: <T extends number>(
    register: T,
    value: number | bigint,
  ): PVMSingleModRegister<T> => {
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
  obj: <T>(data: T): PVMSingleModObject<T> => ({
    type: "object",
    data,
  }),
};
