import { Gas, PVMRegisterRawValue, u32 } from "@/generic-types";
import { PVMExitReason } from "./pvm-exit-reason";

export type PVMSingleMod<T, K> = { type: T; data: K };
export type PVMSingleModGas = PVMSingleMod<"gas", Gas>;
export type PVMSingleModPointer = PVMSingleMod<"ip", u32>;
export type PVMSingleModMemory = PVMSingleMod<
  "memory",
  { from: u32; data: Buffer }
>;
export type PVMSingleModObject<T> = PVMSingleMod<"object", T>;
export type PVMSingleModRegister<T extends number> = PVMSingleMod<
  "register",
  { index: T; value: PVMRegisterRawValue }
>;

export type PVMExitReasonMod<X extends PVMExitReason> = PVMSingleMod<"exit", X>;
