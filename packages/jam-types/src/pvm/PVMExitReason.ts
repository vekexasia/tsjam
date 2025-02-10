import { u32, u8 } from "@/genericTypes.js";

export enum RegularPVMExitReason {
  Halt = 0,
  Panic = 1,
  OutOfGas = 2,
}
export type PVMExitReasonHostCall = { type: "host-call"; opCode: u8 };
export type PVMExitReasonPageFault = { type: "page-fault"; address: u32 };
export type PVMExitReason =
  | RegularPVMExitReason
  | PVMExitReasonHostCall
  | PVMExitReasonPageFault;
