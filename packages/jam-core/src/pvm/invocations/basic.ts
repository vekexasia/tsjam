import { PVMProgramCodec } from "@/codecs/pvm-program-codec";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { PVMProgram } from "@tsjam/types";
import { ParsedProgram } from "../parse-program";
import { pvmSingleStep } from "./single-step";
import { log } from "@/utils";

export const deblobProgram = (
  bold_p: Uint8Array,
):
  | PVMExitReasonImpl
  | { parsedProgram: ParsedProgram; program: PVMProgram } => {
  let program: PVMProgram;
  try {
    program = PVMProgramCodec.decode(bold_p).value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return PVMExitReasonImpl.panic();
  }
  const parsedProgram = ParsedProgram.parse(program);
  return { parsedProgram, program };
};
/**
 * Basic invocation
 * `Ψ` in the graypaper
 * $(0.7.1 - 4.22 / A.1)
 */
export const basicInvocation = (
  // bold_p: Uint8Array,
  bold_p: { parsedProgram: ParsedProgram; program: PVMProgram },
  executionContext: PVMProgramExecutionContextImpl,
): {
  context: PVMProgramExecutionContextImpl;
  exitReason: PVMExitReasonImpl;
} => {
  // how to handle errors here?
  let intermediateState = executionContext;
  const idx = 1;
  while (intermediateState.gas > 0) {
    const out = pvmSingleStep(bold_p, intermediateState);
    //if (process.env.DEBUG_STEPS === "true") {
    //  const ip = intermediateState.instructionPointer;
    //  const ix = bold_p.parsedProgram.ixAt(ip);
    //  log(
    //    `${(idx++).toString().padEnd(4, " ")} [@${ip.toString().padEnd(6, " ")}] - ${ix?.identifier.padEnd(20, " ")} ${debugContext(out.p_context)}`,
    //    true,
    //  );
    //}
    if (typeof out.exitReason !== "undefined") {
      log("exitReson != empty", process.env.DEBUG_STEPS === "true");
      log(out.exitReason.toString(), process.env.DEBUG_STEPS === "true");
      return {
        context: out.p_context.clone(),
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.p_context;
  }

  // const resContext = new PVMProgramExecutionContextImpl(intermediateState);
  //resContext.memory = resContext.memory;
  // resContext.registers = resContext.registers;
  //resContext.memory = resContext.memory.clone();
  //resContext.registers = cloneCodecable(resContext.registers);
  return {
    context: intermediateState,
    exitReason: PVMExitReasonImpl.outOfGas(),
  };
};

const debugContext = (ctx: PVMProgramExecutionContextImpl) => {
  return `regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};
