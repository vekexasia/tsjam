import { u32, u8 } from "@/generic-types";

export enum RegularPVMExitReason {
  Halt = 0,
  Panic = 1,
  OutOfGas = 2,
}
export enum IrregularPVMExitReason {
  HostCall = 3,
  PageFault = 4,
}
export type PVMExitReasonHostCall = { type: "host-call"; opCode: u8 };
export type PVMExitReasonPageFault = { type: "page-fault"; address: u32 };
export type PVMExitReason = {
  reason: RegularPVMExitReason | IrregularPVMExitReason;
  address?: u32;
  opCode?: u8;
};
