import { newSTF } from "@vekexasia/jam-utils";
import {
  CoreIndex,
  PVMExitReason,
  WorkPackage,
  u32,
} from "@vekexasia/jam-types";
import { argumentInvocation } from "@/invocations/argument.js";
import { E_4, WorkPackageCodec } from "@vekexasia/jam-codec";
import { HostCallExecutor } from "@/invocations/hostCall.js";
import { omega_g } from "@/functions/general.js";
import { processIxResult } from "@/invocations/singleStep.js";

/**
 * `ΨI` in the paper
 * it's stateless so `null` for curState
 */
export const isAuthorizedInvocation = newSTF<
  null,
  { package: WorkPackage; core: CoreIndex },
  PVMExitReason | Uint8Array
>((input) => {
  const args = new Uint8Array(WorkPackageCodec.encodedSize(input.package) + 4);
  WorkPackageCodec.encode(input.package, args);
  E_4.encode(BigInt(input.core), args.subarray(args.length - 4));

  argumentInvocation.apply(
    {
      p: new Uint8Array(),
      arguments: args,
      ctx: {},
      fn: null as any,
    },
    {
      gas: Gi,
      memory: new Uint8Array(),
      registers: new Uint8Array(),
      instructionPointer: 0 as any,
    },
  );
  throw new Error("not implemented");
});
/**
 * TODO set the correct value
 */
const Gi = 0n;

const F_Fn: HostCallExecutor = (input) => {
  if (input.hostCallOpcode === 0 /** ΩG */) {
    processIxResult(
      { ...input.ctx, instructionPointer: 4 as u32 },
      omega_g.execute(input.ctx),
      omega_g.gasCost,
      0,
    );
    const r = omega_g.execute(input);
  }
  throw new Error("not implemnented");
};
