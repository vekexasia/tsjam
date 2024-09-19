import { PVMProgramExecutionContextBase } from "@vekexasia/jam-types";
import { HostCallResult } from "@vekexasia/jam-constants";

export const fnReturn = <T extends object>(
  p: PVMProgramExecutionContextBase,
  regs: Partial<{
    w0: number | HostCallResult;
    w1: number | HostCallResult;
    w2: number | HostCallResult;
    w3: number | HostCallResult;
    w4: number | HostCallResult;
    w5: number | HostCallResult;
    w6: number | HostCallResult;
    w7: number | HostCallResult;
    w8: number | HostCallResult;
    w9: number | HostCallResult;
    w10: number | HostCallResult;
    w11: number | HostCallResult;
    w12: number | HostCallResult;
  }>,
  other: T = {} as T,
): PVMProgramExecutionContextBase & T => {
  return {
    ...p,
    ...other,
    registers: [
      regs.w0 ?? p.registers[0],
      regs.w1 ?? p.registers[1],
      regs.w2 ?? p.registers[2],
      regs.w3 ?? p.registers[3],
      regs.w4 ?? p.registers[4],
      regs.w5 ?? p.registers[5],
      regs.w6 ?? p.registers[6],
    ] as PVMProgramExecutionContextBase["registers"],
  };
};
