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
  address?: u32;
  opCode?: u8;

  constructor(config: ConditionalExcept<PVMExitReasonImpl, Function>) {
    Object.assign(this, config);
  }

  isHostCall(): this is PVMExitReasonImpl & {
    reason: IrregularPVMExitReason.HostCall;
    opCode: u8;
  } {
    return this.reason === IrregularPVMExitReason.HostCall;
  }

  isPageFault(): this is PVMExitReasonImpl & {
    reason: IrregularPVMExitReason.PageFault;
    address: u32;
  } {
    return this.reason === IrregularPVMExitReason.PageFault;
  }

  isPanic(): this is PVMExitReasonImpl & {
    reason: RegularPVMExitReason.Panic;
  } {
    return this.reason === RegularPVMExitReason.Panic;
  }

  isHalt(): this is PVMExitReasonImpl & {
    reason: RegularPVMExitReason.Halt;
  } {
    return this.reason === RegularPVMExitReason.Halt;
  }

  isOutOfGas(): this is PVMExitReasonImpl & {
    reason: RegularPVMExitReason.OutOfGas;
  } {
    return this.reason === RegularPVMExitReason.OutOfGas;
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
      opCode: opCode,
    });
  }

  static pageFault(address: u32) {
    return new PVMExitReasonImpl({
      reason: IrregularPVMExitReason.PageFault,
      address: address,
    });
  }
}
