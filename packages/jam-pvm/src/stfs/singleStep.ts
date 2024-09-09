import { newSTF, toPosterior, toTagged } from "@vekexasia/jam-utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  Posterior,
  RegularPVMExitReason,
  u32,
} from "@vekexasia/jam-types";
import { trap } from "@/instructions/ixs/no_arg_ixs.js";
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
  return ixExecutor(input, state);
});

const ixExecutor = (
  input: Input,
  state: PVMProgramExecutionContext,
): Output => {
  const ix = input.parsedProgram.ixAt(state.instructionPointer);
  if (
    state.instructionPointer >= input.program.c.length ||
    state.instructionPointer < 0 ||
    typeof ix === "undefined"
  ) {
    // out of bounds ix pointer or invalid ix
    state.gas = toTagged(state.gas - 1n); // trap
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
    // todo for memory ?
    // maybe instead of cloning the memory object we should either create a temp memory object
    // that records modifications at each step
    registers:
      state.registers.slice() as PVMProgramExecutionContext["registers"],
  };
  const context = {
    execution: p_state,
    program: input.program,
    parsedProgram: input.parsedProgram,
  };

  // account for gas cost independently of evaluation
  if (p_state.gas === state.gas) {
    p_state.gas = toTagged(state.gas - ix.gasCost);
  }

  let r: { exitReason?: PVMExitReason } | void = void 0;
  try {
    r = ix.evaluate(context, ...args);
  } catch (e) {
    // trap
    p_state.gas = toTagged(p_state.gas - trap.gasCost);
    return {
      ...trap.evaluate({ ...context, execution: p_state }),
      posteriorContext: toPosterior(p_state),
    };
  }

  if (typeof r?.exitReason !== "undefined") {
    return {
      exitReason: r.exitReason,
      posteriorContext: toPosterior(p_state),
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
