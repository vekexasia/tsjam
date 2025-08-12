import { IParsedProgram, PVMProgram, Posterior } from "@tsjam/types";
import { toPosterior } from "@tsjam/utils";
import { applyMods } from "../functions/utils";
import { IxMod, TRAP_COST } from "../instructions/utils";
import type { PVMExitReasonImpl, PVMProgramExecutionContextImpl } from "@/impls";

type Output = {
  p_context: Posterior<PVMProgramExecutionContextImpl>;
  exitReason?: PVMExitReasonImpl;
};

export const debugContext = (ctx: PVMProgramExecutionContextImpl) => {
  // pvmLogger.debug("regs", { regs: ctx.registers.join(", ") });
  return `\t regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};

/**
 * SingleStep State Transition Function
 * Ψ1 in the graypaper
 * $(0.6.4 - A.6)
 */
export const pvmSingleStep = (
  p: { program: PVMProgram; parsedProgram: IParsedProgram },
  ctx: PVMProgramExecutionContextImpl,
): Output => {
  const ix = p.parsedProgram.ixAt(ctx.instructionPointer);
  if (process.env.DEBUG_STEPS === "true") {
    console.log(
      `[@${ctx.instructionPointer}] - ${ix?.identifier} ${debugContext(ctx)}`,
    );
  }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars
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
  // $(0.6.4 - A.8)
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
