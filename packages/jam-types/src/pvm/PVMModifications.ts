import { Gas, RegisterValue, u32 } from "@/genericTypes.js";
import {
  PVMExitReason,
  PVMExitReasonHostCall,
  PVMExitReasonPageFault,
  RegularPVMExitReason,
} from "./PVMExitReason";

export type PVMSingleMod<T, K> = { type: T; data: K };
export type PVMSingleModGas = PVMSingleMod<"gas", Gas>;
export type PVMSingleModPointer = PVMSingleMod<"ip", u32>;
export type PVMSingleModMemory = PVMSingleMod<
  "memory",
  { from: u32; data: Uint8Array }
>;
export type PVMSingleModObject<T> = PVMSingleMod<"object", T>;
export type PVMSingleModRegister<T extends number> = PVMSingleMod<
  "register",
  { index: T; value: RegisterValue }
>;
export type PVMExitMod<Kind = PVMExitReason> = PVMSingleMod<"exit", Kind>;

export type PVMExitReasonMod = PVMExitMod<RegularPVMExitReason>;
export type PVMExitHaltMod = PVMExitMod<RegularPVMExitReason.Halt>;
export type PVMExitOutOfGasMod = PVMExitMod<RegularPVMExitReason.OutOfGas>;
export type PVMExitPanicMod = PVMExitMod<RegularPVMExitReason.Panic>;
export type PVMExitPageFaultMod = PVMExitMod<PVMExitReasonPageFault>;
export type PVMExitHostCallMod = PVMExitMod<PVMExitReasonHostCall>;
