import { PVMIxEvaluateFNContext, PVMProgram } from "@tsjam/types";
import { PVMProgramExecutionContextImpl } from "./pvm-program-execution-context-impl";
import { ParsedProgram } from "@/pvm";
import { ConditionalExcept } from "type-fest";

export class PVMIxEvaluateFNContextImpl implements PVMIxEvaluateFNContext {
  execution!: PVMProgramExecutionContextImpl;
  program!: PVMProgram;
  parsedProgram!: ParsedProgram;
  constructor(config: ConditionalExcept<PVMIxEvaluateFNContextImpl, Function>) {
    Object.assign(this, config);
  }
}
