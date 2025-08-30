import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { PVMRegisterImpl } from "@/impls/pvm/pvm-register-impl";
import { RegisterIdentifier, u32 } from "@tsjam/types";
import type { HydratedArgs } from "./types";

/**
 * hydrates the Ix args from the pure decoders
 */
export function hydrateIxArgs<
  T extends {
    rA?: RegisterIdentifier;
    rB?: RegisterIdentifier;
    rD?: RegisterIdentifier;
    ipOffsetRaw?: number;
    // hydrated
    wA?: PVMRegisterImpl;
    wB?: PVMRegisterImpl;
    wD?: PVMRegisterImpl;
    ipOffset: u32;
  },
>(decoded: T, ctx: PVMIxEvaluateFNContextImpl): HydratedArgs<T> {
  const regs = ctx.execution.registers.elements;
  // registers
  if (typeof decoded.rA !== "undefined") {
    decoded.wA = regs[decoded.rA!];
  }
  if (typeof decoded.rB !== "undefined") {
    decoded.wB = regs[decoded.rB!];
  }
  if (typeof decoded.rD !== "undefined") {
    decoded.wD = regs[decoded.rD!];
  }
  if (typeof decoded.ipOffsetRaw !== "undefined") {
    decoded.ipOffset = <u32>(
      (ctx.execution.instructionPointer + decoded.ipOffsetRaw!)
    );
  }
  return <HydratedArgs<T>>decoded;
}
