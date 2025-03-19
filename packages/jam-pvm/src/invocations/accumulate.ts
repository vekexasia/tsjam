import {
  DeferredTransfer,
  Delta,
  Gas,
  Hash,
  JamState,
  Posterior,
  PVMAccumulationOp,
  PVMAccumulationState,
  PVMProgramExecutionContext,
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
  omega_b,
  omega_f,
  omega_n,
  omega_j,
  omega_y,
  omega_q,
  omega_s,
  omega_t,
  omega_u,
} from "@/functions/accumulate.js";
import { applyMods } from "@/functions/utils.js";
import {
  E_4_int,
  E_sub_int,
  HashCodec,
  HashJSONCodec,
  PVMAccumulationOpCodec,
  Uint8ArrayJSONCodec,
  createArrayLengthDiscriminator,
  createCodec,
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
import { Hashing } from "@tsjam/crypto";
import { WorkOutputJSONCodec } from "@tsjam/codec";

const AccumulateArgsCodec = createCodec<{
  t: Tau;
  s: ServiceIndex;
  o: PVMAccumulationOp[];
}>([
  ["t", E_sub_int<Tau>(4)],
  ["s", E_sub_int<ServiceIndex>(4)],
  ["o", createArrayLengthDiscriminator(PVMAccumulationOpCodec)],
]);

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * $(0.6.1 - B.8)
 * accumulation is defined in section 12
 */
export const accumulateInvocation = (
  pvmAccState: PVMAccumulationState, // u
  s: ServiceIndex, // s
  gas: Gas, // g
  o: PVMAccumulationOp[], // bold_o
  t: Tau, // t
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamState["entropy"][0]>;
  },
): [PVMAccumulationState, DeferredTransfer[], Hash | undefined, u64] => {
  const iRes = I_fn(pvmAccState, s, deps.p_eta_0, deps.p_tau);
  // first case
  if (!pvmAccState.delta.has(s)) {
    return [iRes.u, [], undefined, toTagged(0n)];
  }

  const serviceAccount = pvmAccState.delta.get(s)!;
  const code = serviceAccount.preimage_p.get(serviceAccount.codeHash);
  assert(typeof code !== "undefined", "Code not found in preimage");

  console.log("arguments", { t, s, o });
  console.log(
    "encoded",
    Uint8ArrayJSONCodec.toJSON(
      encodeWithCodec(AccumulateArgsCodec, { t, s, o }),
    ),
    "op",
    ...(() => {
      if (o.length === 0) return [];
      return [
        "packageHash",
        HashJSONCodec().toJSON(o[0].packageHash),
        "payloadHash",
        HashJSONCodec().toJSON(o[0].payloadHash),
        "output",
        WorkOutputJSONCodec.toJSON(o[0].output),
        o[0].output,
      ];
    })(),
  );
  const mres = argumentInvocation(
    code,
    5 as u32, // instructionPointer
    gas,
    encodeWithCodec(AccumulateArgsCodec, { t, s, o }),
    F_fn(s, t),
    { x: iRes, y: I_fn(pvmAccState, s, deps.p_eta_0, deps.p_tau) },
  );

  const _o = mres.exitReason ?? mres.ok![1];
  return C_fn(gas, _o, mres.out);
};

/**
 * $(0.6.1 - B.9)
 */
const I_fn = (
  pvmAccState: PVMAccumulationState,
  service: ServiceIndex,
  p_eta_0: Posterior<JamState["entropy"][0]>,
  p_tau: Posterior<Tau>,
): PVMResultContext => {
  const d: Delta = new Map(pvmAccState.delta);
  d.delete(service);
  const newServiceIndex = <ServiceIndex>((E_4_int.decode(
    Hashing.blake2bBuf(
      encodeWithCodec(
        createCodec<{ s: ServiceIndex; p_eta_0: Hash; tau: Tau }>([
          ["s", E_sub_int<ServiceIndex>(4)],
          ["p_eta_0", HashCodec],
          ["tau", E_sub_int<Tau>(4)],
        ]),
        { s: service, p_eta_0, tau: p_tau },
      ),
    ),
  ).value %
    (2 ** 32 - 2 ** 9)) +
    2 ** 8);

  const i = check_fn(
    newServiceIndex,
    pvmAccState.delta, // u_d
  );

  return {
    service,
    u: {
      ...structuredClone(pvmAccState),
    },
    i,
    transfer: [],
    y: undefined,
  };
};

/**
 * $(0.6.1 - B.10)
 */
const F_fn: (
  service: ServiceIndex,
  tau: Tau,
) => HostCallExecutor<{ x: PVMResultContext; y: PVMResultContext }> =
  (service: ServiceIndex, tau: Tau) => (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    const bold_d = new Map([...input.out.x.u.delta.entries()]);
    const bold_s = input.out.x.u.delta.get(service)!;
    switch (fnIdentifier) {
      case "read": {
        const { ctx, out } = applyMods(
          input.ctx,
          input.out,
          omega_r(
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
          omega_w(input.ctx, bold_s, input.out.x.service),
        );
        return G_fn(m.ctx, m.out.bold_s, input.out);
      }
      case "lookup": {
        const m = applyMods(
          input.ctx,
          input.out,
          omega_l(input.ctx, bold_s, input.out.x.service, bold_d),
        );
        return G_fn(m.ctx, bold_s, m.out);
      }
      case "gas": {
        const m = applyMods(input.ctx, input.out, omega_g(input.ctx));
        return G_fn(m.ctx, bold_s, m.out);
      }
      case "info": {
        const m = applyMods(
          input.ctx,
          input.out,
          omega_i(input.ctx, input.out.x.service, bold_d),
        );

        return G_fn(m.ctx, bold_s, m.out);
      }
      case "bless":
        return applyMods(input.ctx, input.out, omega_b(input.ctx, input.out.x));
      case "assign":
        return applyMods(input.ctx, input.out, omega_a(input.ctx, input.out.x));
      case "designate":
        return applyMods(input.ctx, input.out, omega_d(input.ctx, input.out.x));
      case "checkpoint":
        return applyMods(
          input.ctx,
          input.out,
          omega_c(input.ctx, input.out.x, input.out.y),
        );
      case "new":
        return applyMods(input.ctx, input.out, omega_n(input.ctx, input.out.x));
      case "upgrade":
        return applyMods(input.ctx, input.out, omega_u(input.ctx, input.out.x));
      case "transfer":
        return applyMods(input.ctx, input.out, omega_t(input.ctx, input.out.x));
      case "eject":
        return applyMods(
          input.ctx,
          input.out,
          omega_j(input.ctx, input.out.x, tau),
        );
      case "query":
        return applyMods(input.ctx, input.out, omega_q(input.ctx, input.out.x));
      case "solicit":
        return applyMods(
          input.ctx,
          input.out,
          omega_s(input.ctx, input.out.x, tau),
        );
      case "forget":
        return applyMods(
          input.ctx,
          input.out,
          omega_f(input.ctx, input.out.x, tau),
        );
      case "yield":
        return applyMods(input.ctx, input.out, omega_y(input.ctx, input.out.x));
    }
    throw new Error("not implemented");
  };
//
/**
 * $(0.6.1 - B.11)
 */
const G_fn = (
  context: PVMProgramExecutionContext,
  serviceAccount: ServiceAccount,
  x: { x: PVMResultContext; y: PVMResultContext },
): ReturnType<
  HostCallExecutor<{ x: PVMResultContext; y: PVMResultContext }>
> => {
  x.x.u = { ...x.x.u, delta: new Map([...x.x.u.delta.entries()]) };
  x.x.u.delta.set(x.x.service, serviceAccount);
  return {
    out: x,
    ctx: { ...context },
  };
};

/**
 * $(0.6.1 - B.12)
 */
const C_fn = (
  gas: u64,
  o: Uint8Array | RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic,
  d: { x: PVMResultContext; y: PVMResultContext },
): [PVMAccumulationState, DeferredTransfer[], Hash | undefined, u64] => {
  if (o === RegularPVMExitReason.OutOfGas || o === RegularPVMExitReason.Panic) {
    return [d.y.u, d.y.transfer, d.y.y, gas];
  } else if (o.length === 32) {
    return [d.x.u, d.x.transfer, bytesToBigInt(o) as unknown as Hash, gas];
  } else {
    return [d.x.u, d.x.transfer, d.x.y, gas];
  }
};
