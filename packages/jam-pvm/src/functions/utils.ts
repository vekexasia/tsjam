import {
  Gas,
  PVMExitReason,
  PVMExitMod,
  PVMProgramExecutionContext,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
} from "@tsjam/types";
import { PVMMemory } from "@/pvmMemory.js";
import { IxMod } from "@/instructions/utils";

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
 * it's idempotent
 */
export const applyMods = <T extends object>(
  ctx: PVMProgramExecutionContext,
  out: T,
  mods: Array<
    | PVMSingleModRegister<number>
    | PVMSingleModPointer
    | PVMExitMod
    | XMod
    | YMod
    | PVMSingleModMemory
    | PVMSingleModObject<T>
    | PVMSingleModGas
  >,
): {
  ctx: PVMProgramExecutionContext;
  out: T;
  exitReason?: PVMExitReason;
} => {
  const newCtx = {
    ...ctx,
    registers: [
      ...ctx.registers,
    ] as PVMProgramExecutionContextBase["registers"],
  };
  let exitReason: PVMExitReason | undefined;
  // we cycle through all mods and stop at the end or if
  // exitReason is set (whichever comes first)
  for (let i = 0; i < mods.length && typeof exitReason === "undefined"; i++) {
    const mod = mods[i];
    if (mod.type === "ip") {
      newCtx.instructionPointer = mod.data;
    } else if (mod.type === "gas") {
      newCtx.gas = (newCtx.gas - mod.data) as Gas;
    } else if (mod.type === "exit") {
      exitReason = mod.data;
    } else if (mod.type === "register") {
      // console.log(`✏️ Reg[${mod.data.index}] = ${mod.data.value.toString(16)}`);
      newCtx.registers[mod.data.index] = mod.data.value;
    } else if (mod.type === "memory") {
      // we check for page fault before applying
      const firstUnwriteable = newCtx.memory.firstUnwriteable(
        mod.data.from,
        mod.data.data.length,
      );
      if (typeof firstUnwriteable === "undefined") {
        newCtx.memory = (newCtx.memory as PVMMemory).clone();
        newCtx.memory.setBytes(mod.data.from, mod.data.data);
      } else {
        const r = applyMods(newCtx, out, [
          ...IxMod.pageFault(firstUnwriteable, ctx),
        ]);
        exitReason = r.exitReason;
        newCtx.instructionPointer = r.ctx.instructionPointer;
        newCtx.gas = r.ctx.gas;
      }
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
