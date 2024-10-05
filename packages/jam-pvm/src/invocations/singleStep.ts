import { toPosterior, toTagged } from "@tsjam/utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMModification,
  PVMProgram,
  PVMProgramExecutionContext,
  PVMSingleModExit,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModPointer,
  PVMSingleModRegister,
  Posterior,
  RegularPVMExitReason,
  u32,
} from "@tsjam/types";
import { trap } from "@/instructions/ixs/no_arg_ixs.js";

type Output = {
  p_context: Posterior<PVMProgramExecutionContext>;
  exitReason?: PVMExitReason;
};

/**
 * SingleStep State Transition Function
 * Ψ1 in the graypaper
 * (217)
 */
export const pvmSingleStep = (
  p: { program: PVMProgram; parsedProgram: IParsedProgram },
  ctx: PVMProgramExecutionContext,
): Output => {
  const ix = p.parsedProgram.ixAt(ctx.instructionPointer);
  if (
    ctx.instructionPointer >= p.program.c.length ||
    ctx.instructionPointer < 0 ||
    typeof ix === "undefined"
  ) {
    // out of bounds ix pointer or invalid ix
    return {
      exitReason: RegularPVMExitReason.Panic,
      p_context: toPosterior({
        ...ctx,
        gas: toTagged(ctx.gas - trap.gasCost),
      }),
    };
  }

  const skip = p.parsedProgram.skip(ctx.instructionPointer);
  const byteArgs = p.program.c.subarray(
    ctx.instructionPointer + 1,
    typeof skip !== "undefined"
      ? ctx.instructionPointer + skip + 1
      : p.program.c.length,
  );
  const args = ix.decode(byteArgs);

  const context = {
    execution: ctx,
    program: p.program,
    parsedProgram: p.parsedProgram,
  };

  let r = [];
  try {
    r = ix.evaluate(context, ...args);
  } catch (e) {
    // inner panics
    return processIxResult(
      ctx,
      [
        { type: "exit", data: RegularPVMExitReason.Panic },
        { type: "gas", data: toTagged(trap.gasCost) },
        { type: "gas", data: toTagged(ix.gasCost) },
      ],
      ix.gasCost,
      skip,
    );
  }
  return processIxResult(ctx, r, ix.gasCost, skip);
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;
  const { createEvContext } = await import("@/test/mocks.js");
  describe("singleStep", () => {
    it("should panic if no instructions", () => {
      const evaluationContext = createEvContext();
      const out = pvmSingleStep(
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
  result: PVMModification[],
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
      .filter((x): x is PVMSingleModGas => x.type === "gas")
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
      .filter((x): x is PVMSingleModPointer => x.type === "ip")
      .forEach((x) => {
        p_context.instructionPointer = x.data;
      });
  }

  if (result.some((x) => x.type === "register")) {
    result
      .filter((x): x is PVMSingleModRegister<number> => x.type === "register")
      .forEach((x) => {
        p_context.registers[x.data.index] = x.data.value;
      });
  }

  if (result.some((x) => x.type === "memory")) {
    result
      .filter((x): x is PVMSingleModMemory => x.type === "memory")
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
      exitReason: result.find((x): x is PVMSingleModExit => x.type === "exit")!
        .data,
      p_context,
    };
  }

  return {
    p_context: p_context,
  };
};
