import { newSTF, toTagged } from "@vekexasia/jam-utils";
import {
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
  i64,
} from "@vekexasia/jam-types";
import { pvmSingleStepSTF } from "@/stfs/singleStep.js";
import { ParsedProgram } from "@/parseProgram.js";

export const runProgramSTF = newSTF<
  PVMProgramExecutionContext,
  { program: PVMProgram },
  {
    context: Omit<PVMProgramExecutionContext, "gas"> & { gas: i64 };
    exitReason?: PVMExitReason;
    // TODO:implement host exitreason
  }
>((input, curState) => {
  // how to handle errors here?
  const parsedProgram = ParsedProgram.parse(input.program);

  let intermediateState = curState;
  while (intermediateState.gas > 0) {
    const out = pvmSingleStepSTF.apply(
      {
        program: input.program,
        parsedProgram,
      },
      intermediateState,
    );
    if (typeof out.exitReason !== "undefined") {
      return {
        context: {
          ...out.posteriorContext,
          gas: toTagged(out.posteriorContext.gas),
        },
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.posteriorContext;
  }
  return {
    context: {
      ...curState,
      gas: toTagged(intermediateState.gas),
    },
    exitReason: RegularPVMExitReason.OutOfGas,
  };
});
