import { PVMProgramCodec } from "@/codecs/pvm-program-codec";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { PVMProgram } from "@tsjam/types";
import { ParsedProgram } from "../parse-program";
import { log } from "@/utils";
import { PVMIxEvaluateFNContextImpl } from "@/impls/pvm/pvm-ix-evaluate-fn-context-impl";

export const deblobProgram = (
  bold_p: Uint8Array,
): PVMExitReasonImpl | ParsedProgram => {
  let program: PVMProgram;
  try {
    program = PVMProgramCodec.decode(bold_p).value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return PVMExitReasonImpl.panic();
  }
  return ParsedProgram.parse(program);
};
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
  // how to handle errors here?
  let idx = 1;
  while (ctx.execution.gas > 0) {
    const curPointer = ctx.execution.instructionPointer;
    const exitReason = bold_p.singleStep(ctx); //pvmSingleStep(bold_p, intermediateState);
    if (process.env.DEBUG_STEPS === "true") {
      const ip = curPointer;
      const ix = bold_p.ixAt(curPointer);
      log(
        `${(idx++).toString().padEnd(4, " ")} [@${ip.toString().padEnd(6, " ")}] - ${ix?.identifier.padEnd(20, " ")} ${debugContext(ctx.execution)}`,
        true,
      );
    }
    if (typeof exitReason !== "undefined") {
      log("exitReson != empty", process.env.DEBUG_STEPS === "true");
      log(exitReason.toString(), process.env.DEBUG_STEPS === "true");
      return exitReason;
    }
  }

  // const resContext = new PVMProgramExecutionContextImpl(intermediateState);
  //resContext.memory = resContext.memory;
  // resContext.registers = resContext.registers;
  //resContext.memory = resContext.memory.clone();
  //resContext.registers = cloneCodecable(resContext.registers);
  return PVMExitReasonImpl.outOfGas();
};

const debugContext = (ctx: PVMProgramExecutionContextImpl) => {
  return `regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};
