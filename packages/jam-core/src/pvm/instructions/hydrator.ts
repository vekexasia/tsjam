import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import type { HydratedArgs } from "./types";
import { PVMRegisterRawValue, RegisterIdentifier, u32 } from "@tsjam/types";

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
    wA?: PVMRegisterRawValue;
    wB?: PVMRegisterRawValue;
    wD?: PVMRegisterRawValue;
    ipOffset: u32;
  },
>(decoded: T, ctx: PVMIxEvaluateFNContextImpl): HydratedArgs<T> {
  const regs = ctx.execution.registers.elements;
  // registers
  if (typeof decoded.rA !== "undefined") {
    decoded.wA = regs[decoded.rA!].value;
  }
  if (typeof decoded.rB !== "undefined") {
    decoded.wB = regs[decoded.rB!].value;
  }
  if (typeof decoded.rD !== "undefined") {
    decoded.wD = regs[decoded.rD!].value;
  }
  if (typeof decoded.ipOffsetRaw !== "undefined") {
    decoded.ipOffset = <u32>(
      (ctx.execution.instructionPointer + decoded.ipOffsetRaw!)
    );
  }
  return <HydratedArgs<T>>decoded;
}
