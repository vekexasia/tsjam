import {
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModRegister,
  u32,
} from "@vekexasia/jam-types";

export const IxMod = {
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
