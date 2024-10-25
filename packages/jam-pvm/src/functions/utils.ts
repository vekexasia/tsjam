import {
  PVMProgramExecutionContextBase,
  PVMResultContext,
  PVMSingleModMemory,
  PVMSingleModObject,
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
export type HaltPvm = { type: "halt" };
/**
 * applies modifications from fns output to compute new ctx and out
 * @param ctx - the current context
 * @param out - the current out
 * @param mods - the modifications to apply
 */
export const applyMods = <T extends object>(
  ctx: PVMProgramExecutionContextBase,
  out: T,
  mods: Array<
    | PVMSingleModRegister<number>
    | HaltPvm
    | XMod
    | YMod
    | PVMSingleModMemory
    | PVMSingleModObject<T>
  >,
): {
  ctx: PVMProgramExecutionContextBase;
  out: T;
  exitReason?: RegularPVMExitReason;
} => {
  const newCtx = {
    ...ctx,
    registers: [
      ...ctx.registers,
    ] as PVMProgramExecutionContextBase["registers"],
  };
  let haltPVM = false;
  for (const mod of mods) {
    if (mod.type === "halt") {
      haltPVM = true;
    } else if (mod.type === "register") {
      newCtx.registers[mod.data.index] = mod.data.value;
    } else if (mod.type === "memory") {
      newCtx.memory = (newCtx.memory as PVMMemory).clone();
      newCtx.memory.setBytes(mod.data.from, mod.data.data);
    } else if (mod.type === "object") {
      for (const key in mod.data) {
        // @ts-expect-error - we know that key is a key of T
        out[key] = mod.data[key];
      }
    }
  }
  return {
    ctx: newCtx,
    out,
    exitReason: haltPVM ? RegularPVMExitReason.Halt : undefined,
  };
};
