import { toPosterior } from "@tsjam/utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  Posterior,
  RegularPVMExitReason,
} from "@tsjam/types";
import { applyMods } from "@/functions/utils";
import { IxMod, TRAP_COST } from "@/instructions/utils";

type Output = {
  p_context: Posterior<PVMProgramExecutionContext>;
  exitReason?: PVMExitReason;
};

export const debugContext = (ctx: PVMProgramExecutionContext) => {
  // pvmLogger.debug("regs", { regs: ctx.registers.join(", ") });
  console.log(`\t regs:[${ctx.registers.join(", ")}] gas:${ctx.gas}`);
};

/**
 * SingleStep State Transition Function
 * Ψ1 in the graypaper
 * $(0.6.2 - A.6)
 */
export const pvmSingleStep = (
  p: { program: PVMProgram; parsedProgram: IParsedProgram },
  ctx: PVMProgramExecutionContext,
): Output => {
  const ix = p.parsedProgram.ixAt(ctx.instructionPointer);
  console.log(`[@${ctx.instructionPointer}] - ${ix?.identifier}`);

  debugContext(ctx);

  if (
    ctx.instructionPointer >= p.program.c.length ||
    ctx.instructionPointer < 0 ||
    typeof ix === "undefined"
  ) {
    // out of bounds ix pointer or invalid ix
    const o = applyMods(ctx, {} as object, [
      IxMod.gas(TRAP_COST + (ix?.gasCost ?? 0n)),
      IxMod.panic(),
    ]);
    return {
      p_context: toPosterior(o.ctx),
      exitReason: o.exitReason,
    };
  }

  const skip = p.parsedProgram.skip(ctx.instructionPointer) + 1;
  const byteArgs = p.program.c.subarray(
    ctx.instructionPointer + 1,
    typeof skip !== "undefined"
      ? ctx.instructionPointer + skip
      : p.program.c.length,
  );

  const context = {
    execution: ctx,
    program: p.program,
    parsedProgram: p.parsedProgram,
  };

  let args: unknown;
  try {
    args = ix.decode(byteArgs, context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    //pvmLogger.warn(`Decoding error for ${ix.identifier}`, e.message);
    const o = applyMods(ctx, {} as object, [
      IxMod.skip(ctx.instructionPointer, skip), //NOTE: not sure we should skip
      IxMod.gas(TRAP_COST + ix.gasCost),
      IxMod.panic(),
    ]);
    return {
      p_context: toPosterior(o.ctx),
      exitReason: o.exitReason,
    };
  }

  const ixMods = ix.evaluate(args, context);

  // we apply the gas and skip.
  // if an instruction pointer is set we apply it and override the skip inside
  // the applyMods
  // $(0.6.1 - A.7)
  const rMod = applyMods(ctx, {} as object, [
    IxMod.gas(ix.gasCost), // g′ = g − g∆
    IxMod.skip(ctx.instructionPointer, skip), // i'
    ...ixMods,
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
