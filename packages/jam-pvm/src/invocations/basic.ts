import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
} from "@tsjam/types";
import { pvmSingleStep } from "@/invocations/singleStep.js";

/**
 * Basic invocation
 * `Ψ` in the graypaper
 *  @see (33) - 0.4.5
 */
export const basicInvocation = (
  p: { parsedProgram: IParsedProgram; program: PVMProgram },
  executionContext: PVMProgramExecutionContext,
): { context: PVMProgramExecutionContext; exitReason: PVMExitReason } => {
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
