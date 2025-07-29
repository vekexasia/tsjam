import { AccumulationOutImpl } from "@/classes/AccumulationOutImpl";
import { PVMAccumulationOpImpl } from "@/classes/pvm/PVMAccumulationOPImpl";
import { PVMAccumulationStateImpl } from "@/classes/pvm/PVMAccumulationStateImpl";
import { PVMResultContextImpl } from "@/classes/pvm/PVMResultContextImpl";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import {
  createCodec,
  E_int,
  createArrayLengthDiscriminator,
  JamCodec,
  encodeWithCodec,
  E_4_int,
  E_sub_int,
  HashCodec,
} from "@tsjam/codec";
import { Hashing } from "@tsjam/crypto";
import {
  Hash,
  Tau,
  ServiceIndex,
  Gas,
  Posterior,
  JamEntropy,
  u32,
  PVMProgramExecutionContext,
  RegularPVMExitReason,
} from "@tsjam/types";
import { toTagged, bytesToBigInt } from "@tsjam/utils";
import assert from "assert";
import {
  omega_b,
  omega_a,
  omega_d,
  omega_c,
  omega_n,
  omega_u,
  omega_t,
  omega_j,
  omega_q,
  omega_s,
  omega_f,
  omega_y,
  omega_aries,
} from "../functions/accumulate";
import { FnsDb } from "../functions/fnsdb";
import {
  omega_r,
  omega_w,
  omega_l,
  omega_g,
  omega_i,
} from "../functions/general";
import { applyMods } from "../functions/utils";
import { IxMod } from "../instructions/utils";
import { check_fn } from "../utils/check_fn";
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./hostCall";

const AccumulateArgsCodec = createCodec<{
  t: Tau;
  s: ServiceIndex;
  o: PVMAccumulationOpImpl[];
}>([
  ["t", E_int<Tau>()],
  ["s", E_int<ServiceIndex>()],
  [
    "o",
    createArrayLengthDiscriminator(
      <JamCodec<PVMAccumulationOpImpl>>PVMAccumulationOpImpl,
    ),
  ],
]);

/**
 * Accumulate State Transition Function
 * ΨA in the graypaper
 * $(0.6.4 - B.9)
 * accumulation is defined in section 12
 */
export const accumulateInvocation = (
  pvmAccState: PVMAccumulationStateImpl, // u
  s: ServiceIndex, // s
  gas: Gas, // g
  o: PVMAccumulationOpImpl[], // bold_o
  t: Tau, // t
  deps: {
    p_tau: Posterior<Tau>;
    p_eta_0: Posterior<JamEntropy["_0"]>;
  },
): AccumulationOutImpl => {
  const iRes = I_fn(pvmAccState, s, deps.p_eta_0, deps.p_tau);
  const yRes = structuredClone(iRes);

  // first case
  if (!pvmAccState.accounts.has(s)) {
    return new AccumulationOutImpl({
      postState: iRes.u,
      deferredTransfers: [],
      yield: undefined,
      gasUsed: toTagged(0n),
      provision: [],
    });
  }

  const serviceAccount = pvmAccState.accounts.get(s)!;
  const code = serviceAccount.code();
  assert(typeof code !== "undefined", "Code not found in preimage");

  const mres = argumentInvocation(
    code,
    5 as u32, // instructionPointer
    gas,
    encodeWithCodec(AccumulateArgsCodec, { t, s, o }),
    F_fn(s, t),
    { x: iRes, y: yRes },
  );

  return C_fn(mres.gasUsed, mres.res, mres.out);
};

/**
 * $(0.6.5 - B.10)
 */
const I_fn = (
  pvmAccState: PVMAccumulationStateImpl,
  service: ServiceIndex,
  p_eta_0: Posterior<JamEntropy["_0"]>,
  p_tau: Posterior<Tau>,
): PVMResultContextImpl => {
  const d = pvmAccState.accounts.clone();
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
    pvmAccState.accounts, // u_d
  );

  return new PVMResultContextImpl({
    service,
    u: structuredClone(pvmAccState),
    i,
    transfer: [],
    y: undefined,
    preimages: [],
  });
};

/**
 * $(0.6.4 - B.11)
 */
const F_fn: (
  service: ServiceIndex,
  tau: Tau,
) => HostCallExecutor<{ x: PVMResultContextImpl; y: PVMResultContextImpl }> =
  (service: ServiceIndex, tau: Tau) => (input) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    const bold_d = input.out.x.u.accounts.clone();

    const bold_s = input.out.x.boldS(service)!;
    switch (fnIdentifier) {
      case "read": {
        const { ctx, out } = applyMods(
          input.ctx,
          input.out,
          omega_r(input.ctx, bold_s, input.out.x.service, bold_d),
        );
        return G_fn(ctx, bold_s, out);
      }
      case "write": {
        const m = applyMods<{ bold_s: ServiceAccountImpl }>(
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
        return applyMods(
          input.ctx,
          input.out,
          omega_n(input.ctx, input.out.x, tau),
        );
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
      case "provide":
        return applyMods(
          input.ctx,
          input.out,
          omega_aries(input.ctx, input.out.x, input.out.x.service),
        );
    }
    if (input.hostCallOpcode === 100) {
      // TODO: https://docs.jamcha.in/knowledge/testing/polka-vm/host-call-log
      return applyMods(input.ctx, input.out, [IxMod.gas(10n)]);
    }
    throw new Error("not implemented" + input.hostCallOpcode);
  };
//
/**
 * $(0.6.4 - B.12)
 */
const G_fn = (
  context: PVMProgramExecutionContext,
  serviceAccount: ServiceAccountImpl,
  x: { x: PVMResultContextImpl; y: PVMResultContextImpl },
): ReturnType<
  HostCallExecutor<{ x: PVMResultContextImpl; y: PVMResultContextImpl }>
> => {
  x.x.u = { ...x.x.u, accounts: x.x.u.accounts.clone() };
  x.x.u.accounts.set(x.x.service, serviceAccount);
  return {
    out: x,
    ctx: { ...context },
  };
};

/**
 * $(0.6.5 - B.11)
 */
const C_fn = (
  gas: Gas,
  o: Uint8Array | RegularPVMExitReason.OutOfGas | RegularPVMExitReason.Panic,
  d: { x: PVMResultContextImpl; y: PVMResultContextImpl },
): AccumulationOutImpl => {
  if (o === RegularPVMExitReason.OutOfGas || o === RegularPVMExitReason.Panic) {
    return new AccumulationOutImpl({
      postState: d.x.u,
      deferredTransfers: d.x.transfer,
      yield: d.y.y,
      gasUsed: toTagged(gas),
      provision: d.x.preimages,
    });
  } else if (o.length === 32) {
    return new AccumulationOutImpl({
      postState: d.x.u,
      deferredTransfers: d.x.transfer,
      yield: bytesToBigInt(o) as unknown as Hash,
      gasUsed: toTagged(gas),
      provision: d.x.preimages,
    });
  } else {
    return new AccumulationOutImpl({
      postState: d.x.u,
      deferredTransfers: d.x.transfer,
      yield: d.x.y,
      gasUsed: toTagged(gas),
      provision: d.x.preimages,
    });
  }
};
