import { newSTF, toPosterior, toTagged } from "@vekexasia/jam-utils";
import {
  IParsedProgram,
  PVMExitReason,
  PVMProgram,
  PVMProgramExecutionContext,
  Posterior,
  u8,
} from "@vekexasia/jam-types";
import { Ixdb } from "@/instructions/ixdb.js";
import assert from "node:assert";
type Input = { program: PVMProgram; parsedProgram: IParsedProgram };
export const pvmSingleStepSTF = newSTF<
  PVMProgramExecutionContext,
  Input,
  {
    posteriorContext: Posterior<PVMProgramExecutionContext>;
    exitReason?: PVMExitReason;
  }
>((input: Input, state: PVMProgramExecutionContext) => {
  const currentInstruction = input.program.c[state.instructionPointer];
  const ix = Ixdb.byCode.get(currentInstruction as u8);
  assert(ix, `Unknown instruction ${currentInstruction}`);
  const nextIx = input.parsedProgram.skip(state.instructionPointer);
  const args = ix!.decode(
    input.program.c.subarray(
      state.instructionPointer,
      nextIx ? state.instructionPointer + nextIx : undefined,
    ),
  );
  const context = {
    execution: state,
    program: input.program,
    parsedProgram: input.parsedProgram,
  };
  const r = ix!.evaluate(context, ...args);
  let p_ixPointer = state.instructionPointer + nextIx;
  let exitReason: PVMExitReason | undefined = undefined; // continue
  if (r && r.exitReason) {
    exitReason = r.exitReason;
  } else if (r && r.nextInstructionPointer !== undefined) {
    p_ixPointer = r.nextInstructionPointer;
  }

  // gas
  // context.gas = context.gas - ix!.gasCost(...args);

  return {
    exitReason,
    posteriorContext: toPosterior({
      ...state,
      instructionPointer: toTagged(p_ixPointer),
    }),
  };
});
