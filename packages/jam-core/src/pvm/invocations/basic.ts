import { PVMProgramCodec } from "@/codecs/pvm-program-codec";
import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { PVMProgram } from "@tsjam/types";
import { ParsedProgram } from "../parse-program";
import { pvmSingleStep } from "./single-step";
import { cloneCodecable } from "@tsjam/codec";
import { log } from "@/utils";

/**
 * Basic invocation
 * `Ψ` in the graypaper
 * $(0.7.1 - 4.22 / A.1)
 */
export const basicInvocation = (
  bold_p: Uint8Array,
  executionContext: PVMProgramExecutionContextImpl,
): {
  context: PVMProgramExecutionContextImpl;
  exitReason: PVMExitReasonImpl;
} => {
  let program: PVMProgram;
  try {
    program = PVMProgramCodec.decode(bold_p).value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return {
      context: executionContext,
      exitReason: PVMExitReasonImpl.panic(),
    };
  }
  const parsedProgram = ParsedProgram.parse(program);
  const p = { parsedProgram, program };
  // how to handle errors here?
  let intermediateState = executionContext;
  let idx = 1;
  while (intermediateState.gas > 0) {
    const out = pvmSingleStep(p, intermediateState);
    const debugLog = process.env.DEBUG_STEPS === "true";
    if (debugLog) {
      const ip = intermediateState.instructionPointer;
      const ix = parsedProgram.ixAt(ip);
      log(
        `${(idx++).toString().padEnd(4, " ")} [@${ip.toString().padEnd(6, " ")}] - ${ix?.identifier.padEnd(20, " ")} ${debugContext(out.p_context)}`,
        true,
      );
    }
    if (typeof out.exitReason !== "undefined") {
      log("exitReson != empty", debugLog);
      log(out.exitReason.toString(), debugLog);
      return {
        context: out.p_context.clone(),
        exitReason: out.exitReason,
      };
    }
    intermediateState = out.p_context;
  }

  const resContext = new PVMProgramExecutionContextImpl(intermediateState);
  resContext.memory = resContext.memory.clone();
  resContext.registers = cloneCodecable(resContext.registers);
  return {
    context: resContext,
    exitReason: PVMExitReasonImpl.outOfGas(),
  };
};

const debugContext = (ctx: PVMProgramExecutionContextImpl) => {
  return `regs:[${ctx.registers.elements.join(" ")}] gas:${ctx.gas}`;
};
