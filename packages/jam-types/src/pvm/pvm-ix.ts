import {
  PVMExitReasonMod,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModPointer,
  PVMSingleModRegister,
} from "./pvm-modifications";
import { RegisterIdentifier } from "./register-identifier";
export type PVMIxReturnMods = Array<
  | PVMSingleModPointer
  | PVMSingleModGas
  | PVMSingleModMemory
  | PVMSingleModRegister<RegisterIdentifier>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | PVMExitReasonMod<any>
>;
