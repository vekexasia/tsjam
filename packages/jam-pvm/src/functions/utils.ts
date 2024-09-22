import {
  PVMProgramExecutionContextBase,
  PVMResultContext,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModRegister,
} from "@vekexasia/jam-types";
import { PVMMemory } from "@/pvmMemory.js";

export type W0 = PVMSingleModRegister<0>;
export type W1 = PVMSingleModRegister<1>;
export type XMod = PVMSingleModObject<{ x: PVMResultContext }>;
export type YMod = PVMSingleModObject<{ y: PVMResultContext }>;

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
    W0 | W1 | XMod | YMod | PVMSingleModMemory | PVMSingleModObject<T>
  >,
): { ctx: PVMProgramExecutionContextBase; out: T } => {
  const newCtx = {
    ...ctx,
    registers: [
      ...ctx.registers,
    ] as PVMProgramExecutionContextBase["registers"],
  };
  for (const mod of mods) {
    if (mod.type === "register") {
      newCtx.registers[mod.data.index] = mod.data.value;
    } else if (mod.type === "memory") {
      newCtx.memory = (newCtx.memory as PVMMemory).clone();
      newCtx.memory.setBytes(mod.data.from, mod.data.data);
    } else if (mod.type === "object") {
      for (const key in mod.data) {
        (out as any)[key] = (mod.data as any)[key];
      }
    }
  }
  return { ctx: newCtx, out };
};
