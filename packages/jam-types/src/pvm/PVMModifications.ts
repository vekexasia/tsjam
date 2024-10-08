import { u32, u64 } from "@/genericTypes.js";

export type PVMSingleMod<T, K> = { type: T; data: K };
export type PVMSingleModGas = PVMSingleMod<"gas", u64>;
export type PVMSingleSelfGas = PVMSingleMod<"self-gas", undefined>;
export type PVMSingleModPointer = PVMSingleMod<"ip", u32>;
export type PVMSingleModMemory = PVMSingleMod<
  "memory",
  { from: u32; data: Uint8Array }
>;
export type PVMSingleModObject<T> = PVMSingleMod<"object", T>;
export type PVMSingleModRegister<T extends number> = PVMSingleMod<
  "register",
  { index: T; value: u32 }
>;
export type PVMModification =
  | PVMSingleModPointer
  | PVMSingleSelfGas
  | PVMSingleModGas
  | PVMSingleModMemory
  | PVMSingleModRegister<number>;
