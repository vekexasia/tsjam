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
  // registers
  if ("rA" in decoded) {
    decoded.wA = ctx.execution.registers.elements[decoded.rA!].value;
  }
  if ("rB" in decoded) {
    decoded.wB = ctx.execution.registers.elements[decoded.rB!].value;
  }
  if ("rD" in decoded) {
    decoded.wD = ctx.execution.registers.elements[decoded.rD!].value;
  }
  if ("ipOffsetRaw" in decoded) {
    decoded.ipOffset = <u32>(
      (ctx.execution.instructionPointer + decoded.ipOffsetRaw!)
    );
  }
  return <HydratedArgs<T>>decoded;
}
