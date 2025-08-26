import {
  Gas,
  PVMSingleMod,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
} from "@tsjam/types";
import { IxMod } from "../instructions/utils";
import { PVMMemory } from "../pvm-memory";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { PVMRegisterImpl } from "@/impls/pvm/pvm-register-impl";
import { PVMResultContextImpl } from "@/impls/pvm/pvm-result-context-impl";
import { BufferJSONCodec, cloneCodecable } from "@tsjam/codec";
import { log } from "@/utils";

export type W0 = PVMSingleModRegister<0>;
export type W1 = PVMSingleModRegister<1>;
export type W7 = PVMSingleModRegister<7>;
export type W8 = PVMSingleModRegister<8>;

export type XMod = PVMSingleModObject<{ x: PVMResultContextImpl }>;
export type YMod = PVMSingleModObject<{ y: PVMResultContextImpl }>;

/**
 * applies modifications from fns output to compute new ctx and out
 * @param ctx - the current context
 * @param out - the current out
 * @param mods - the modifications to apply
 * it's idempotent
 */
export const applyMods = <T extends object>(
  ctx: PVMProgramExecutionContextImpl,
  out: T,
  mods: Array<
    | PVMSingleModRegister<number>
    | PVMSingleModPointer
    | PVMSingleMod<"exit", PVMExitReasonImpl>
    | XMod
    | YMod
    | PVMSingleModMemory
    | PVMSingleModObject<T>
    | PVMSingleModGas
  >,
): {
  ctx: PVMProgramExecutionContextImpl;
  out: T;
  exitReason?: PVMExitReasonImpl;
} => {
  // const newCtx = new PVMProgramExecutionContextImpl({
  //   ...ctx,
  //   registers: cloneCodecable(ctx.registers),
  // });
  const newCtx = ctx;
  let exitReason: PVMExitReasonImpl | undefined;
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
      newCtx.registers.elements[mod.data.index] = new PVMRegisterImpl(
        mod.data.value,
      );
    } else if (mod.type === "memory") {
      // we check for page fault before applying
      const firstUnwriteable = newCtx.memory.firstUnwriteable(
        mod.data.from,
        mod.data.data.length,
      );
      if (typeof firstUnwriteable === "undefined") {
        // newCtx.memory = (newCtx.memory as PVMMemory).clone();
        //log(
        //  `✏️ Mem[${mod.data.from.toString(16)}..${
        //    mod.data.data.length
        //  }] = <${BufferJSONCodec().toJSON(<any>mod.data.data)}>`,
        //  true,
        //);
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
