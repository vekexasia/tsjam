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
 * $(0.6.1 - A.5)
 */
export const pvmSingleStep = (
  p: { program: PVMProgram; parsedProgram: IParsedProgram },
  ctx: PVMProgramExecutionContext,
): Output => {
  const ix = p.parsedProgram.ixAt(ctx.instructionPointer);
  // console.log(`[@${ctx.instructionPointer}] - ${ix?.identifier}`);

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
      ? ctx.instructionPointer + skip
      : p.program.c.length,
  );
  // console.log(ix.identifier);
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
    return { p_context: toPosterior(rMod.ctx), exitReason: r.error.type };
  }
  // console.log("ops", r.value);

  // check for memory
  const unallowedWrites = r.value
    .filter((mod) => mod.type === "memory")
    .map((mod) =>
      ctx.memory.firstUnwriteable(mod.data.from, mod.data.data.length),
    )
    .filter((m) => typeof m !== "undefined");

  if (unallowedWrites.length > 0) {
    const mods: PVMSingleModGas[] = [];
    mods.push(IxMod.gas(trap.gasCost));

    const rMod = applyMods(ctx, {} as object, [...mods, IxMod.gas(ix.gasCost)]);
    return {
      p_context: toPosterior(rMod.ctx),
      exitReason: { type: "page-fault", memoryLocationIn: unallowedWrites[0] },
    };
  }

  // $(0.6.1 - A.6)
  const rMod = applyMods(ctx, {} as object, [
    IxMod.gas(ix.gasCost), // g′ = g − g∆
    IxMod.skip(ctx.instructionPointer, skip), // i'
    ...r.value,
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
