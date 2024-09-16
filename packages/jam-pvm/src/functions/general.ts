import { regFn } from "@/functions/fnsdb.js";
import { PVMProgramExecutionContextBase, u8 } from "@vekexasia/jam-types";

/**
 * `ΩG`
 */
export const gamma_g = regFn({
  opCode: 0 as u8,
  identifier: "gas",
  fn: {
    gasCost: 10n,
    execute(context: { execution: PVMProgramExecutionContextBase }) {
      const p_gas = context.execution.gas - this.gasCost;
      return {
        ...context.execution,
        registers: [
          p_gas % BigInt(2 ** 32),
          p_gas / BigInt(2 ** 32),
          ...context.execution.registers.slice(2),
        ],
      };
    },
  },
});

export const gamma_l = regFn({
  opCode: 1 as u8,
  identifier: "lookup",
  fn: {
    gasCost: 10n,
    execute(context: { execution: PVMProgramExecutionContextBase }) {
      throw new Error("Not implemented");
    },
  },
});

export const gamma_r = regFn({
  opCode: 2 as u8,
  identifier: "read",
  fn: {
    gasCost: 10n,
    execute(context: { execution: PVMProgramExecutionContextBase }) {
      throw new Error("Not implemented");
    },
  },
});
