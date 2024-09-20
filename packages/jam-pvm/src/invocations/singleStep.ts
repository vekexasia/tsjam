import { newSTF, toPosterior, toTagged } from "@vekexasia/jam-utils";
import {
  IParsedProgram,
  IxModification,
  IxSingleModExit,
  IxSingleModGas,
  IxSingleModMemory,
  IxSingleModPointer,
  IxSingleModRegister,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  Posterior,
  RegularPVMExitReason,
  u32,
} from "@vekexasia/jam-types";
import { trap } from "@/instructions/ixs/no_arg_ixs.js";
import { createThreadsRpcOptions } from "vitest/workers";

type Input = { program: PVMProgram; parsedProgram: IParsedProgram };
type Output = {
  p_context: Posterior<PVMProgramExecutionContext>;
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

/**
 * computes the new context after the ix has been applied
 * @param context - the current context
 * @param result - the result of the ix evaluation
 * @param gasCost - the gas cost of the ix
 * @param skip - the result of skip fn
 * @returns the new context
 */
export const processIxResult = (
  context: PVMProgramExecutionContext,
  result: IxModification[],
  gasCost: bigint,
  skip: number,
): {
  exitReason?: PVMExitReason;
  p_context: Posterior<PVMProgramExecutionContext>;
} => {
  // compute p_context
  const p_context: Posterior<PVMProgramExecutionContext> = toPosterior({
    ...context,
    registers:
      context.registers.slice() as PVMProgramExecutionContext["registers"],
  });

  if (!result.some((x) => x.type === "gas")) {
    p_context.gas = toTagged(context.gas - gasCost);
  } else {
    result
      .filter((x): x is IxSingleModGas => x.type === "gas")
      .forEach((x) => {
        p_context.gas = toTagged(p_context.gas - x.data);
      });
  }

  const invalidMemWrite = result.some(
    (x) =>
      x.type === "memory" &&
      !context.memory.canWrite(x.data.from, x.data.data.length),
  );
  if (invalidMemWrite) {
    p_context.gas = toTagged(context.gas - trap.gasCost - gasCost);
    return {
      exitReason: RegularPVMExitReason.Panic,
      p_context,
    };
  }

  // instruction pointer
  if (!result.some((x) => x.type === "ip")) {
    // if the instruction did not jump to another instruction
    // we default to skip
    p_context.instructionPointer = (context.instructionPointer +
      (skip ? skip + 1 : 0)) as u32;
  } else {
    result
      .filter((x): x is IxSingleModPointer => x.type === "ip")
      .forEach((x) => {
        p_context.instructionPointer = x.data;
      });
  }

  if (result.some((x) => x.type === "register")) {
    result
      .filter((x): x is IxSingleModRegister => x.type === "register")
      .forEach((x) => {
        p_context.registers[x.data.index] = x.data.value;
      });
  }

  if (result.some((x) => x.type === "memory")) {
    result
      .filter((x): x is IxSingleModMemory => x.type === "memory")
      .forEach((x) => {
        p_context.memory.setBytes(x.data.from, x.data.data);
      });
  }

  if (result.some((x) => x.type === "exit")) {
    // in this case we reset the instruction pointer to the curr instruction (unless there is one result item)
    if (!result.some((x) => x.type === "ip")) {
      p_context.instructionPointer = context.instructionPointer;
    }

    return {
      exitReason: result.find((x): x is IxSingleModExit => x.type === "exit")!
        .data,
      p_context,
    };
  }

  return {
    p_context: p_context,
  };
};

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
    return {
      exitReason: RegularPVMExitReason.Panic,
      p_context: toPosterior({
        ...state,
        gas: toTagged(state.gas - trap.gasCost),
      }),
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

  const context = {
    execution: state,
    program: input.program,
    parsedProgram: input.parsedProgram,
  };

  let r = [];
  try {
    r = ix.evaluate(context, ...args);
  } catch (e) {
    // inner panics
    return processIxResult(
      state,
      [
        { type: "exit", data: RegularPVMExitReason.Panic },
        { type: "gas", data: toTagged(trap.gasCost) },
        { type: "gas", data: toTagged(ix.gasCost) },
      ],
      ix.gasCost,
      skip,
    );
  }
  return processIxResult(state, r, ix.gasCost, skip);
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
