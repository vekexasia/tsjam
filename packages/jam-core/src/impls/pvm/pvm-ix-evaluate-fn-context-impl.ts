import { PVMIxEvaluateFNContext, PVMProgram } from "@tsjam/types";
import type { PVMProgramExecutionContextImpl } from "./pvm-program-execution-context-impl";
import { ConditionalExcept } from "type-fest";
import { ParsedProgram } from "@/pvm/parse-program";

export class PVMIxEvaluateFNContextImpl implements PVMIxEvaluateFNContext {
  execution!: PVMProgramExecutionContextImpl;
  program!: PVMProgram;
  parsedProgram!: ParsedProgram;
  constructor(config: ConditionalExcept<PVMIxEvaluateFNContextImpl, Function>) {
    Object.assign(this, config);
  }
}
