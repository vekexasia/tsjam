import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
} from "@tsjam/types";
import { pvmSingleStep } from "@/invocations/singleStep.js";
import { PVMProgramCodec } from "@tsjam/codec";
import { ParsedProgram } from "@/parseProgram";

/**
 * Basic invocation
 * `Ψ` in the graypaper
 * $(0.6.4 - 4.22 / A.1)
 */
export const basicInvocation = (
  bold_p: Uint8Array,
  executionContext: PVMProgramExecutionContext,
): { context: PVMProgramExecutionContext; exitReason: PVMExitReason } => {
  let program: PVMProgram;
  try {
    program = PVMProgramCodec.decode(bold_p).value;
  } catch (e) {
    return {
      context: executionContext,
      exitReason: RegularPVMExitReason.Panic,
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
        context: {
          ...out.p_context,
        },
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.p_context;
  }
  return {
    context: {
      ...intermediateState,
    },
    exitReason: RegularPVMExitReason.OutOfGas,
  };
};
