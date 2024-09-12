import { u32 } from "@/genericTypes.js";

export enum RegularPVMExitReason {
  Halt = 0,
  Panic = 1,
  OutOfGas = 2,
}
export type PVMExitReason =
  | RegularPVMExitReason
  | {
      type: "host-call";
      h: u32;
    }
  | {
      type: "page-fault";
      memoryLocationIn: u32;
    };
