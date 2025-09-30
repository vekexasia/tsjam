import { PVMRegisterImpl } from "@tsjam/pvm-base";
import { RegisterIdentifier, i32, u32 } from "@tsjam/types";

/**
 * Type-level hydrator: given a pure decoded shape T (returned by a decoder)
 * produce the shape that instruction handlers expect after hydration.
 */
export type HydratedArgs<T> = T &
  (T extends { rA: RegisterIdentifier } ? { wA: PVMRegisterImpl } : object) &
  (T extends { rB: RegisterIdentifier } ? { wB: PVMRegisterImpl } : object) &
  (T extends { rD: RegisterIdentifier } ? { wD: PVMRegisterImpl } : object) &
  (T extends { ipOffsetRaw: i32 } ? { ipOffset: u32 } : object);
