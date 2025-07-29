import {
  IrregularPVMExitReason,
  PVMExitReason,
  RegularPVMExitReason,
  u32,
  u8,
} from "@tsjam/types";
import { ConditionalExcept } from "type-fest";

export class PVMExitReasonImpl implements PVMExitReason {
  reason!: RegularPVMExitReason | IrregularPVMExitReason;
  data?: u32 | undefined;

  constructor(config: ConditionalExcept<PVMExitReasonImpl, Function>) {
    Object.assign(this, config);
  }

  static panic() {
    return new PVMExitReasonImpl({
      reason: RegularPVMExitReason.Panic,
    });
  }
  static halt() {
    return new PVMExitReasonImpl({
      reason: RegularPVMExitReason.Halt,
    });
  }
  static outOfGas() {
    return new PVMExitReasonImpl({
      reason: RegularPVMExitReason.OutOfGas,
    });
  }

  static hostCall(opCode: u8) {
    return new PVMExitReasonImpl({
      reason: IrregularPVMExitReason.HostCall,
      data: opCode as number as u32,
    });
  }

  static pageFault(address: u32) {
    return new PVMExitReasonImpl({
      reason: IrregularPVMExitReason.PageFault,
      data: address,
    });
  }
}
