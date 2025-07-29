import { PVMExitReasonImpl } from "@/classes/pvm/PVMExitReasonImpl";
import { PVMProgramExecutionContextImpl } from "@/classes/pvm/PVMProgramExecutionContextImpl";
import { PVMProgramCodec } from "@/codecs/PVMProgramCodec";
import { PVMProgram } from "@tsjam/types";
import { ParsedProgram } from "../parseProgram";
import { pvmSingleStep } from "./singleStep";

/**
 * Basic invocation
 * `Ψ` in the graypaper
 * $(0.6.4 - 4.22 / A.1)
 */
export const basicInvocation = (
  bold_p: Uint8Array,
  executionContext: PVMProgramExecutionContextImpl,
): {
  context: PVMProgramExecutionContextImpl;
  exitReason: PVMExitReasonImpl;
} => {
  let program: PVMProgram;
  try {
    program = PVMProgramCodec.decode(bold_p).value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return {
      context: executionContext,
      exitReason: PVMExitReasonImpl.panic(),
    };
  }
  const parsedProgram = ParsedProgram.parse(program);
  const p = { parsedProgram, program };
  // how to handle errors here?
  let intermediateState = executionContext;
  while (intermediateState.gas > 0) {
    const out = pvmSingleStep(p, intermediateState);
    if (typeof out.exitReason !== "undefined") {
      return {
        context: structuredClone(out.p_context),
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.p_context;
  }
  return {
    context: structuredClone(intermediateState),
    exitReason: PVMExitReasonImpl.outOfGas(),
  };
};
