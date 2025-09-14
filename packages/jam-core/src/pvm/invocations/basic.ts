import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { ParsedProgram } from "../parse-program";

/**
 * Basic invocation
 * `Ψ` in the graypaper
 * $(0.7.1 - 4.22 / A.1)
 */
export const basicInvocation = (
  // bold_p: Uint8Array,
  bold_p: ParsedProgram,
  ctx: PVMIxEvaluateFNContextImpl,
): PVMExitReasonImpl => {
  return bold_p.run(ctx);
};

const debugContext = (ctx: PVMProgramExecutionContextImpl) => {
  return `regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};
