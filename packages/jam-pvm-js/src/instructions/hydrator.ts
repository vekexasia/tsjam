import { RegisterIdentifier, u32 } from "@tsjam/types";
import type { HydratedArgs } from "./types";
import { PVMRegisterImpl } from "@tsjam/pvm-base";
import { PVMJS } from "..";

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
>(decoded: T, pvm: PVMJS): HydratedArgs<T> {
  const regs = pvm.registers.elements;
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
    decoded.ipOffset = <u32>(pvm.pc + decoded.ipOffsetRaw!);
  }
  return <HydratedArgs<T>>decoded;
}
