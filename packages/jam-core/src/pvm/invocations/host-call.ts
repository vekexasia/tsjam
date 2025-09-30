import "@/pvm/functions/functions";
import { PVM, PVMExitReasonImpl } from "@tsjam/pvm-base";
import { u8 } from "@tsjam/types";
import assert from "assert";

/**
 * Host call invocation
 * `ΨH` in the graypaper
 * $(0.7.1 - A.35)
 */
export const hostCallInvocation = <X>(
  pvm: PVM,
  f: HostCallExecutor<X>,
  x: X,
): HostCallOut<X> => {
  while (true) {
    const outExit = pvm.run();
    if (outExit.isHostCall()) {
      // i'
      const p_i = pvm.pc;
      const hostCallRes = f({
        hostCallOpcode: outExit.opCode,
        pvm: pvm,
        out: x,
      });
      // all flows of A.35 when its host call wants instruction pointer
      // to be the one after the basic invocation
      pvm.pc = p_i;

      if (typeof hostCallRes !== "undefined") {
        // log("not defined res", process.env.DEBUG_TRACES == "true");
        // https://github.com/gavofyork/graypaper/pull/485
        assert(
          false == hostCallRes.isPageFault(),
          "host call cannot return page fault",
        );
        return {
          exitReason: hostCallRes,
          out: x, // this has been modified already by hostcall
        };
      }
    } else {
      // log(
      //   `hostCallInvocation: non-host call exit ${outExit}`,
      //   process.env.DEBUG_TRACES == "true",
      // );
      // regular execution without host call
      return {
        exitReason: outExit,
        out: x,
      };
    }
  }
};

export type HostCallOut<X> = {
  exitReason?: PVMExitReasonImpl;
  out: X;
};

/**
 * `Ω(X)` in the paper
 * it can modify ctx and out (not pure function)
 * $(0.7.1 - A.36)
 */
export type HostCallExecutor<X> = (input: {
  hostCallOpcode: u8;
  pvm: PVM;
  out: X;
}) => PVMExitReasonImpl | undefined;
