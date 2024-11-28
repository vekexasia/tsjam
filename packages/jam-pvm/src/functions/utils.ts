import assert from "assert";
import {
  Gas,
  PVMExitReasonMod,
  PVMProgramExecutionContext,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
  RegularPVMExitReason,
} from "@tsjam/types";
import { PVMMemory } from "@/pvmMemory.js";

export type W0 = PVMSingleModRegister<0>;
export type W1 = PVMSingleModRegister<1>;
export type W7 = PVMSingleModRegister<7>;
export type W8 = PVMSingleModRegister<8>;

export type XMod = PVMSingleModObject<{ x: PVMResultContext }>;
export type YMod = PVMSingleModObject<{ y: PVMResultContext }>;

/**
 * applies modifications from fns output to compute new ctx and out
 * @param ctx - the current context
 * @param out - the current out
 * @param mods - the modifications to apply
 */
export const applyMods = <
  T extends object,
  CTX extends PVMProgramExecutionContextBase = PVMProgramExecutionContextBase,
>(
  ctx: CTX,
  out: T,
  mods: Array<
    | PVMSingleModRegister<number>
    | PVMSingleModPointer
    | PVMExitReasonMod
    | XMod
    | YMod
    | PVMSingleModMemory
    | PVMSingleModObject<T>
    | PVMSingleModGas
  >,
): {
  ctx: CTX;
  out: T;
  exitReason?: RegularPVMExitReason;
} => {
  const newCtx = {
    ...ctx,
    registers: [
      ...ctx.registers,
    ] as PVMProgramExecutionContextBase["registers"],
  };
  let exitReason: RegularPVMExitReason | undefined;
  for (const mod of mods) {
    if (mod.type === "ip") {
      assert(
        typeof (newCtx as unknown as PVMProgramExecutionContext)
          .instructionPointer === "number",
      );
      (newCtx as unknown as PVMProgramExecutionContext).instructionPointer =
        mod.data;
    } else if (mod.type === "gas") {
      newCtx.gas = (newCtx.gas - mod.data) as Gas;
    } else if (mod.type === "exit") {
      if (mod.data === RegularPVMExitReason.Halt) {
        exitReason = RegularPVMExitReason.Halt;
        break;
      } else if (mod.data === RegularPVMExitReason.OutOfGas) {
        exitReason = RegularPVMExitReason.OutOfGas;
        break;
      }
    } else if (mod.type === "register") {
      newCtx.registers[mod.data.index] = mod.data.value;
    } else if (mod.type === "memory") {
      if (!newCtx.memory.canWrite(mod.data.from, mod.data.data.length)) {
        exitReason = RegularPVMExitReason.Panic;
        break;
      }
      newCtx.memory = (newCtx.memory as PVMMemory).clone();
      newCtx.memory.setBytes(mod.data.from, mod.data.data);
    } else if (mod.type === "object") {
      for (const key of Object.keys(mod.data)) {
        // @ts-expect-error - we know that key is a key of T
        out[key] = mod.data[key];
      }
    }
  }
  return {
    ctx: newCtx,
    out,
    exitReason,
  };
};
