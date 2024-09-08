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
import * as console from "node:console";

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

  let runs = 30;
  let intermediateState = curState;
  while (intermediateState.gas > 0) {
    const out = pvmSingleStepSTF.apply(
      {
        program: input.program,
        parsedProgram,
      },
      intermediateState,
    );
    if (out.exitReason) {
      return {
        context: {
          ...out.posteriorContext,
          gas: toTagged(out.posteriorContext.gas),
        },
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.posteriorContext;
    if (runs-- < 0) {
      console.log("breaking");
      console.log(intermediateState);
      break;
    } else {
      console.log(
        ".",
        intermediateState.instructionPointer,
        intermediateState.registers,
      );
    }
  }
  return {
    context: {
      ...curState,
      gas: toTagged(intermediateState.gas),
    },
    exitReason: RegularPVMExitReason.OutOfGas,
  };
});
