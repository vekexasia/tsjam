import { newSTF, toPosterior, toTagged } from "@vekexasia/jam-utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  Posterior,
  RegularPVMExitReason,
  u8,
} from "@vekexasia/jam-types";
import { Ixdb } from "@/instructions/ixdb.js";
type Input = { program: PVMProgram; parsedProgram: IParsedProgram };
type Output = {
  posteriorContext: Posterior<PVMProgramExecutionContext>;
  exitReason?: PVMExitReason;
};
export const pvmSingleStepSTF = newSTF<
  PVMProgramExecutionContext,
  Input,
  Output
>((input: Input, state: PVMProgramExecutionContext): Output => {
  try {
    return ixExecutor(input, state);
  } catch (e) {
    return {
      exitReason: RegularPVMExitReason.Panic,
      posteriorContext: toPosterior(state),
    };
  }
});

const ixExecutor = (
  input: Input,
  state: PVMProgramExecutionContext,
): Output => {
  if (
    state.instructionPointer >= input.program.k.length ||
    state.instructionPointer < 0
  ) {
    // out of bounds ix pointer
    return {
      exitReason: RegularPVMExitReason.Halt,
      posteriorContext: toPosterior(state),
    };
  }
  const currentInstruction = input.program.c[state.instructionPointer];
  const ix = Ixdb.byCode.get(currentInstruction as u8);
  if (typeof ix === "undefined") {
    // may have jumped to an invalid instruction
    return {
      exitReason: RegularPVMExitReason.Panic,
      posteriorContext: toPosterior(state),
    };
  }

  const nextIx = input.parsedProgram.skip(state.instructionPointer);
  const args = ix.decode(
    input.program.c.subarray(
      state.instructionPointer,
      nextIx ? state.instructionPointer + nextIx : undefined,
    ),
  );
  const context = {
    execution: state,
    program: input.program,
    parsedProgram: input.parsedProgram,
  };
  const r = ix.evaluate(context, ...args);

  let p_ixPointer: number | undefined = undefined;
  let exitReason: PVMExitReason | undefined = undefined; // continue
  if (r) {
    if (r.exitReason) {
      exitReason = r.exitReason;
    } else if (r.nextInstructionPointer) {
      p_ixPointer = r.nextInstructionPointer;
    }
  }
  // when exit is set return immediately
  if (exitReason) {
    return {
      exitReason,
      posteriorContext: toPosterior(state),
    };
  }

  if (typeof nextIx === "undefined" && typeof p_ixPointer === "undefined") {
    // if the instruction did not exit and did not jump to another instruction
    // and there is no next instruction
    return {
      exitReason: RegularPVMExitReason.Panic,
      posteriorContext: toPosterior(state),
    };
  }
  if (typeof p_ixPointer === "undefined") {
    // we are certain nextIx is set
    p_ixPointer = state.instructionPointer + nextIx! + 1;
  }

  return {
    exitReason,
    posteriorContext: toPosterior({
      ...state,
      instructionPointer: toTagged(p_ixPointer),
    }),
  };
};

if (import.meta.vitest) {
}
