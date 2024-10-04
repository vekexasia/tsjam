import {
  AuthorizerQueue,
  Dagger,
  Delta,
  Hash,
  PVMAccumulationOp,
  PVMResultContext,
  RegularPVMExitReason,
  SafroleState,
  ServiceAccount,
  ServiceIndex,
  Tau,
  u32,
  u64,
} from "@vekexasia/jam-types";
import { argumentInvocation } from "@/invocations/argument.js";
import { HostCallExecutor } from "@/invocations/hostCall.js";
import { FnsDb } from "@/functions/fnsdb.js";
import {
  omega_a,
  omega_c,
  omega_d,
  omega_e,
  omega_f,
  omega_n,
  omega_s,
  omega_t,
  omega_u,
  omega_x,
} from "@/functions/accumulate.js";
import { applyMods } from "@/functions/utils.js";
import {
  PVMAccumulationOpCodec,
  createArrayLengthDiscriminator,
  encodeWithCodec,
} from "@vekexasia/jam-codec";
import {
  omega_g,
  omega_i,
  omega_l,
  omega_r,
  omega_w,
} from "@/functions/general.js";
import { check_fn } from "@/utils/check_fn.js";

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * (255)
 * accumulation is defined in section 12
 */
export const accumulateInvocation = (
  d_delta: Dagger<Delta>,
  s: ServiceIndex,
  gas: u64,
  o: PVMAccumulationOp[],
  dependencies: {
    iota: SafroleState["iota"];
    authQueue: AuthorizerQueue;
    tau: Tau;
    privilegedServices: {
      m: ServiceIndex;
      a: ServiceIndex;
      v: ServiceIndex;
      g: Map<ServiceIndex, u64>;
    };
  },
): PVMResultContext & { r?: Hash } => {
  if (typeof d_delta.get(s)?.codeHash === "undefined") {
    return {
      serviceAccount: d_delta.get(s),
      service: s,
      p: dependencies.privilegedServices,
      transfers: [],
      c: dependencies.authQueue,
      validatorKeys:
        dependencies.iota as unknown as PVMResultContext["validatorKeys"],
      n: new Map(),
    };
  }

  const codec = createArrayLengthDiscriminator(PVMAccumulationOpCodec);
  const args = encodeWithCodec(codec, o);

  const mres = argumentInvocation(
    new Uint8Array(), // get preimage from dd_delta.get(s)!.codeHash as Uint8Array,
    10 as u32, // instructionPointer
    gas,
    args,
    F_fn(d_delta, s, dependencies.tau),
    I_fn(
      d_delta.get(s)!,
      s,
      dependencies.iota,
      dependencies.authQueue,
      d_delta,
    ),
  );

  const _o = mres.exitReason ?? mres.ok![1];
  return C_fn(_o, mres.out);
};

/**
 *
 * see (256)
 */
const I_fn = (
  serviceAccount: ServiceAccount,
  service: ServiceIndex,
  iota: SafroleState["iota"],
  authQueue: AuthorizerQueue,
  d_delta: Dagger<Delta>,
): { x: PVMResultContext; y: PVMResultContext } => {
  const x: PVMResultContext = {
    serviceAccount,
    c: authQueue,
    validatorKeys: iota as unknown as PVMResultContext["validatorKeys"],
    service: check_fn(service, d_delta),
    transfers: [],
    n: new Map(),
    // todo: fix this to be the correct privileged services
    p: {
      m: service,
      a: service,
      v: service,
      g: new Map(),
    },
  };
  return { x, y: { ...x } };
};

const F_fn: (
  d_delta: Dagger<Delta>,
  service: ServiceIndex,
  tau: Tau,
) => HostCallExecutor<{ x: PVMResultContext; y: PVMResultContext }> =
  (d_delta: Dagger<Delta>, service: ServiceIndex, tau: Tau) => (input) => {
    const fn = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fn.identifier) {
      case "read":
        return applyMods(
          input.ctx,
          input.out,
          omega_r.execute(
            input.ctx,
            input.out.x.serviceAccount!,
            service,
            d_delta,
          ),
        );
      case "write": {
        const m = applyMods(
          input.ctx,
          { bold_s: input.out.x.serviceAccount! },
          omega_w.execute(input.ctx, input.out.x.serviceAccount!, service),
        );
        return {
          ctx: m.ctx,
          out: {
            x: { ...input.out.x, serviceAccount: m.out.bold_s },
            y: input.out.y,
          },
        };
      }
      case "lookup":
        return applyMods(
          input.ctx,
          input.out,
          omega_l.execute(
            input.ctx,
            input.out.x.serviceAccount!,
            service,
            d_delta,
          ),
        );
      case "gas":
        return applyMods(input.ctx, input.out, omega_g.execute(input.ctx));
      case "info":
        return applyMods(
          input.ctx,
          input.out,
          omega_i.execute(
            input.ctx,
            input.out.x.serviceAccount!,
            service,
            d_delta,
            input.out.x.n,
          ),
        );
      case "empower":
        return applyMods(
          input.ctx,
          input.out,
          omega_e.execute(input.ctx, input.out.x),
        );
      case "assign":
        return applyMods(
          input.ctx,
          input.out,
          omega_a.execute(input.ctx, input.out.x),
        );
      case "designate":
        return applyMods(
          input.ctx,
          input.out,
          omega_d.execute(input.ctx, input.out.x),
        );
      case "checkpoint":
        return applyMods(
          input.ctx,
          input.out,
          omega_c.execute(input.ctx, input.out.x, input.out.y),
        );
      case "new":
        return applyMods(
          input.ctx,
          input.out,
          omega_n.execute(input.ctx, input.out.x, d_delta),
        );
      case "upgrade":
        return applyMods(
          input.ctx,
          input.out,
          omega_u.execute(input.ctx, input.out.x, service),
        );
      case "transfer":
        return applyMods(
          input.ctx,
          input.out,
          omega_t.execute(input.ctx, input.out.x, service, d_delta),
        );
      case "quit":
        return applyMods(
          input.ctx,
          input.out,
          omega_x.execute(input.ctx, input.out.x, service, d_delta),
        );
      case "solicit":
        return applyMods(
          input.ctx,
          input.out,
          omega_s.execute(input.ctx, input.out.x, tau),
        );
      case "forget":
        return applyMods(
          input.ctx,
          input.out,
          omega_f.execute(input.ctx, input.out.x, tau),
        );
    }
    throw new Error("not implemented");
  };
//
// /**
//  * (258)
//  */
// const G_fn = (
//   context: PVMProgramExecutionContextBase,
//   serviceAccount: ServiceAccount,
//   x: { x: PVMResultContext; y: PVMResultContext },
// ): PVMProgramExecutionContextBase & {
//   x: PVMResultContext;
//   y: PVMResultContext;
// } => {
//   return {
//     ...context,
//     x: { ...x.x, serviceAccount },
//     y: x.y,
//   };
// };

const C_fn = (
  o: Uint8Array | RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic,
  d: { x: PVMResultContext; y: PVMResultContext },
): PVMResultContext & { r?: Hash } => {
  if (o === RegularPVMExitReason.OutOfGas || o === RegularPVMExitReason.Panic) {
    return {
      ...d.y,
      r: undefined,
    };
  } else if (o.length === 32) {
    // it's an hash
    return {
      ...d.x,
      r: o as unknown as Hash,
    };
  } else {
    return {
      ...d.x,
      r: undefined,
    };
  }
};
