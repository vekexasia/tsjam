import { toPosterior } from "@tsjam/utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  PVMSingleModGas,
  Posterior,
  RegularPVMExitReason,
} from "@tsjam/types";
import { trap } from "@/instructions/ixs/no_arg_ixs.js";
import { applyMods } from "@/functions/utils";
import { IxMod } from "@/instructions/utils";

type Output = {
  p_context: Posterior<PVMProgramExecutionContext>;
  exitReason?: PVMExitReason;
};

/**
 * SingleStep State Transition Function
 * Ψ1 in the graypaper
 * $(0.5.4 - A.5)
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
      p_context: toPosterior(applyMods(ctx, {}, [IxMod.gas(trap.gasCost)]).ctx),
    };
  }

  const skip = p.parsedProgram.skip(ctx.instructionPointer) + 1;
  const byteArgs = p.program.c.subarray(
    ctx.instructionPointer + 1,
    typeof skip !== "undefined"
      ? ctx.instructionPointer + skip + 1
      : p.program.c.length,
  );
  const args = ix.decode(byteArgs);
  if (args.isErr()) {
    const o = applyMods(ctx, {} as object, [
      IxMod.skip(ctx.instructionPointer, skip),
      IxMod.gas(trap.gasCost),
      IxMod.gas(ix.gasCost),
      IxMod.panic(),
    ]);
    return {
      p_context: toPosterior(o.ctx),
      exitReason: o.exitReason,
    };
  }

  const context = {
    execution: ctx,
    program: p.program,
    parsedProgram: p.parsedProgram,
  };

  const r = ix.evaluate(context, ...args.value);
  if (r.isErr()) {
    const mods: PVMSingleModGas[] = [];
    if (r.error.accountTrapCost) {
      mods.push(IxMod.gas(trap.gasCost));
    }

    const rMod = applyMods(ctx, {} as object, [
      ...r.error.mods,
      ...mods,
      IxMod.gas(ix.gasCost),
    ]);
    return { p_context: toPosterior(rMod.ctx), exitReason: rMod.exitReason };
  }

  // $(0.5.4 - A.6)
  const rMod = applyMods(ctx, {} as object, [
    IxMod.gas(ix.gasCost), // g′ = g − g∆
    ...r.value,
    IxMod.skip(ctx.instructionPointer, skip), // i'
  ]);
  return {
    p_context: toPosterior(rMod.ctx),
    exitReason: rMod.exitReason,
  };
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
