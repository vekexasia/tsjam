import { PVMProgram, PVMProgramCode } from "@tsjam/types";
import { PVMExitReasonImpl } from "./pvm-exit-reason";
import { PVMProgramCodec } from "./pvm-program-codec";

export const deblobProgram = (
  programCode: PVMProgramCode,
): PVMProgram | PVMExitReasonImpl => {
  let program: PVMProgram;
  try {
    program = PVMProgramCodec.decode(programCode).value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return PVMExitReasonImpl.panic();
  }
  return program;
};
