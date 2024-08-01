import { RegisterIdentifier } from "@/types.js";

export enum RegularPVMExitReason {
  Halt = 0,
  Panic = 1,
  OutOfGas = 2,
}
export type PVMExitReason =
  | RegularPVMExitReason
  | {
      type: "host-call";
      callIDIn: RegisterIdentifier;
    }
  | {
      type: "page-fault";
      memoryLocationIn: RegisterIdentifier;
    };
