import { newSTF, toPosterior, toTagged } from "@vekexasia/jam-utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  Posterior,
  RegularPVMExitReason,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { Ixdb } from "@/instructions/ixdb.js";
type Input = { program: PVMProgram; parsedProgram: IParsedProgram };
type Output = {
  posteriorContext: Posterior<PVMProgramExecutionContext>;
  exitReason?: PVMExitReason;
};
/**
 * SingleStep State Transition Function
 * Ψ1 in the graypaper
 * (217)
 */
export const pvmSingleStepSTF = newSTF<
  PVMProgramExecutionContext,
  Input,
  Output
>((input: Input, state: PVMProgramExecutionContext): Output => {
  try {
    return ixExecutor(input, state);
  } catch (e) {
    console.log(e);
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
    state.instructionPointer >= input.program.c.length ||
    state.instructionPointer < 0
  ) {
    // out of bounds ix pointer
    return {
      exitReason: RegularPVMExitReason.Panic,
      posteriorContext: toPosterior(state),
    };
  }

  const ix = input.parsedProgram.ixAt(state.instructionPointer);
  if (typeof ix === "undefined") {
    // may have jumped to an invalid instruction
    return {
      exitReason: RegularPVMExitReason.Panic,
      posteriorContext: toPosterior(state),
    };
  }

  const skip = input.parsedProgram.skip(state.instructionPointer);
  const byteArgs = input.program.c.subarray(
    state.instructionPointer + 1,
    typeof skip !== "undefined"
      ? state.instructionPointer + skip + 1
      : input.program.c.length,
  );
  const args = ix.decode(byteArgs);
  const p_state: PVMProgramExecutionContext = {
    ...state,
    // todo for memory
    // maybe instead of cloning the memory object we should either create a temp memory object
    // that records modifications
    registers:
      state.registers.slice() as PVMProgramExecutionContext["registers"],
  };
  const context = {
    execution: p_state,
    program: input.program,
    parsedProgram: input.parsedProgram,
  };

  const r = ix.evaluate(context, ...args);

  if (r?.exitReason) {
    return {
      exitReason: r.exitReason,
      posteriorContext: toPosterior(state),
    };
  }
  if (p_state.instructionPointer === state.instructionPointer) {
    // if the instruction did not jump to another instruction
    // we default to skip
    p_state.instructionPointer = (state.instructionPointer +
      (skip ? skip + 1 : 0)) as u32;
  }

  return {
    posteriorContext: toPosterior(p_state),
  };
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("singleStep", () => {
    it("should panic if no instructions", () => {
      const evaluationContext = createEvContext();
      const out = pvmSingleStepSTF.apply(
        {
          program: evaluationContext.program,
          parsedProgram: evaluationContext.parsedProgram,
        },
        evaluationContext.execution,
      );
      expect(out.exitReason).toBe(RegularPVMExitReason.Panic);
    });
  });
}
