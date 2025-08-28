import { ParsedProgram } from "@/pvm/parse-program";
import { PVMIxEvaluateFNContext } from "@tsjam/types";
import { ConditionalExcept } from "type-fest";
import type { PVMProgramExecutionContextImpl } from "./pvm-program-execution-context-impl";

export class PVMIxEvaluateFNContextImpl implements PVMIxEvaluateFNContext {
  execution!: PVMProgramExecutionContextImpl;
  program!: ParsedProgram;
  constructor(config: ConditionalExcept<PVMIxEvaluateFNContextImpl, Function>) {
    Object.assign(this, config);
  }
}
