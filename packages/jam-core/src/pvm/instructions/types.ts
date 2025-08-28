import {
  u32,
  PVMRegisterRawValue,
  RegisterIdentifier,
  i32,
} from "@tsjam/types";

/**
 * Type-level hydrator: given a pure decoded shape T (returned by a decoder)
 * produce the shape that instruction handlers expect after hydration.
 */
export type HydratedArgs<T> = T &
  (T extends { rA: RegisterIdentifier }
    ? { wA: PVMRegisterRawValue }
    : object) &
  (T extends { rB: RegisterIdentifier }
    ? { wB: PVMRegisterRawValue }
    : object) &
  (T extends { rD: RegisterIdentifier }
    ? { wD: PVMRegisterRawValue }
    : object) &
  (T extends { ipOffsetRaw: i32 } ? { ipOffset: u32 } : object);
