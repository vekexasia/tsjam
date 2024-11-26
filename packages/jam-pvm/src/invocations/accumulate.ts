import {
  DeferredTransfer,
  Delta,
  Gas,
  Hash,
  PVMAccumulationOp,
  PVMAccumulationState,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  RegularPVMExitReason,
  ServiceAccount,
  ServiceIndex,
  Tau,
  u32,
  u64,
} from "@tsjam/types";
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
  omega_q,
  omega_s,
  omega_t,
  omega_u,
} from "@/functions/accumulate.js";
import { applyMods } from "@/functions/utils.js";
import {
  PVMAccumulationOpCodec,
  createArrayLengthDiscriminator,
  encodeWithCodec,
} from "@tsjam/codec";
import {
  omega_g,
  omega_i,
  omega_l,
  omega_r,
  omega_w,
} from "@/functions/general.js";
import { check_fn } from "@/utils/check_fn.js";
import { bytesToBigInt, toTagged } from "@tsjam/utils";
import assert from "assert";

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * (274)
 * accumulation is defined in section 12
 */
export const accumulateInvocation = (
  pvmAccState: PVMAccumulationState,
  s: ServiceIndex,
  gas: Gas,
  o: PVMAccumulationOp[],
  tau: Tau,
): [PVMAccumulationState, DeferredTransfer[], Hash | undefined, u64] => {
  const iRes = I_fn(pvmAccState, s);
  // first case of 274
  if (!pvmAccState.delta.has(s)) {
    return [iRes.u, [], undefined, toTagged(0n)];
  }

  const args = encodeWithCodec(
    createArrayLengthDiscriminator(PVMAccumulationOpCodec),
    o,
  );

  const serviceAccount = pvmAccState.delta.get(s)!;
  const code = serviceAccount.preimage_p.get(serviceAccount.codeHash);
  assert(typeof code !== "undefined", "Code not found in preimage");

  const mres = argumentInvocation(
    code,
    10 as u32, // instructionPointer
    gas,
    args,
    F_fn(s, tau),
    { x: iRes, y: I_fn(pvmAccState, s) },
  );

  const _o = mres.exitReason ?? mres.ok![1];
  return C_fn(gas, _o, mres.out);
};

/**
 *
 * see (256)
 */
const I_fn = (
  pvmAccState: PVMAccumulationState,
  service: ServiceIndex,
): PVMResultContext => {
  const d: Delta = new Map(pvmAccState.delta);
  d.delete(service);
  return {
    delta: d,
    service,
    u: {
      ...pvmAccState,
      delta: new Map([[service, pvmAccState.delta.get(service)]]) as Delta,
    },
    i: check_fn(service, pvmAccState.delta),

    transfer: [],
  };
};

const F_fn: (
  service: ServiceIndex,
  tau: Tau,
) => HostCallExecutor<{ x: PVMResultContext; y: PVMResultContext }> =
  (service: ServiceIndex, tau: Tau) => (input) => {
    const fn = FnsDb.byCode.get(input.hostCallOpcode)!;
    const bold_d = new Map([
      ...input.out.x.u.delta.entries(),
      ...input.out.x.delta.entries(),
    ]);
    const bold_s = input.out.x.u.delta.get(service)!;
    switch (fn.identifier) {
      case "read": {
        const { ctx, out } = applyMods(
          input.ctx,
          input.out,
          omega_r.execute(
            input.ctx,
            input.out.x.u.delta.get(service)!,
            input.out.x.service,
            bold_d,
          ),
        );
        return G_fn(ctx, bold_s, out);
      }
      case "write": {
        const m = applyMods<{ bold_s: ServiceAccount }>(
          input.ctx,
          { bold_s },
          omega_w.execute(input.ctx, bold_s, input.out.x.service),
        );
        return G_fn(m.ctx, m.out.bold_s, input.out);
      }
      case "lookup": {
        const m = applyMods(
          input.ctx,
          input.out,
          omega_l.execute(input.ctx, bold_s, input.out.x.service, bold_d),
        );
        return G_fn(m.ctx, bold_s, m.out);
      }
      case "gas": {
        const m = applyMods(input.ctx, input.out, omega_g.execute(input.ctx));
        return G_fn(m.ctx, bold_s, m.out);
      }
      case "info": {
        const m = applyMods(
          input.ctx,
          input.out,
          omega_i.execute(input.ctx, input.out.x.service, bold_d),
        );

        return G_fn(m.ctx, bold_s, m.out);
      }
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
          omega_n.execute(input.ctx, input.out.x),
        );
      case "upgrade":
        return applyMods(
          input.ctx,
          input.out,
          omega_u.execute(input.ctx, input.out.x),
        );
      case "transfer":
        return applyMods(
          input.ctx,
          input.out,
          omega_t.execute(input.ctx, input.out.x),
        );
      case "quit":
        return applyMods(
          input.ctx,
          input.out,
          omega_q.execute(input.ctx, input.out.x),
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
/**
 * (258)
 */
const G_fn = (
  context: PVMProgramExecutionContextBase,
  serviceAccount: ServiceAccount,
  x: { x: PVMResultContext; y: PVMResultContext },
): ReturnType<
  HostCallExecutor<{ x: PVMResultContext; y: PVMResultContext }>
> => {
  x.x.u.delta.set(x.x.service, serviceAccount);
  return {
    out: x,
    ctx: { ...context },
  };
};

const C_fn = (
  gas: u64,
  o: Uint8Array | RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic,
  d: { x: PVMResultContext; y: PVMResultContext },
): [PVMAccumulationState, DeferredTransfer[], Hash | undefined, u64] => {
  if (o === RegularPVMExitReason.OutOfGas || o === RegularPVMExitReason.Panic) {
    return [d.y.u, d.y.transfer, 0n as Hash, gas];
  } else if (o.length === 32) {
    return [d.x.u, d.x.transfer, bytesToBigInt(o) as unknown as Hash, gas];
  } else {
    return [d.x.u, d.x.transfer, 0n as Hash, gas];
  }
};
