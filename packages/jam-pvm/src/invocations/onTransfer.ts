import {
  DeferredTransfer,
  Delta,
  Gas,
  PVMProgramExecutionContext,
  ServiceAccount,
  ServiceIndex,
  Tau,
  u32,
  u64,
  u8,
} from "@tsjam/types";
import { argumentInvocation } from "./argument";
import { FnsDb } from "@/functions/fnsdb";
import {
  omega_g,
  omega_i,
  omega_l,
  omega_r,
  omega_w,
} from "@/functions/general";
import { HostCallResult } from "@tsjam/constants";
import { applyMods } from "@/functions/utils";
import assert from "node:assert";
import { HostCallExecutor } from "./hostCall";
import { IxMod } from "@/instructions/utils";
import {
  createArrayLengthDiscriminator,
  createCodec,
  DeferredTransferCodec,
  E_sub_int,
  encodeWithCodec,
} from "@tsjam/codec";

const argumentInvocationTransferCodec = createCodec<{
  tau: Tau;
  serviceIndex: ServiceIndex;
  transfers: DeferredTransfer[];
}>([
  ["tau", E_sub_int<Tau>(4)],
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  [
    "transfers",
    createArrayLengthDiscriminator<DeferredTransfer[]>(DeferredTransferCodec),
  ],
]);
/**
 * $(0.6.1 - B.14 / B.15)
 */
export const transferInvocation = (
  d: Delta,
  t: Tau,
  s: ServiceIndex,
  transfers: DeferredTransfer[],
): ServiceAccount => {
  let bold_s = d.get(s)!;

  assert(typeof bold_s !== "undefined", "Service not found in delta");
  bold_s = {
    ...bold_s,
    balance: (bold_s.balance +
      transfers.reduce((acc, a) => acc + a.amount, 0n)) as u64,
  };
  assert(bold_s.balance >= 0, "Balance cannot be negative");

  if (bold_s.codeHash || transfers.length === 0) {
    return bold_s;
  }

  const code = bold_s.preimage_p.get(bold_s.codeHash);
  assert(typeof code !== "undefined", "Code not found in preimage");

  const out = argumentInvocation(
    code,
    10 as u32,
    transfers.reduce((acc, a) => acc + a.gasLimit, 0n) as Gas,
    encodeWithCodec(argumentInvocationTransferCodec, {
      transfers,
      tau: t,
      serviceIndex: s,
    }),
    F_fn(d, s),
    bold_s,
  );
  return out.out;
};

/**
 * $(0.6.1 - B.16)
 */
const F_fn: (d: Delta, s: ServiceIndex) => HostCallExecutor<ServiceAccount> =
  (d: Delta, s: ServiceIndex) =>
  (input: {
    hostCallOpcode: u8;
    ctx: PVMProgramExecutionContext;
    out: ServiceAccount;
  }) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fnIdentifier) {
      case "lookup": {
        return applyMods(
          input.ctx,
          input.out,
          omega_l(input.ctx, input.out, s, d),
        );
      }
      case "read": {
        return applyMods(
          input.ctx,
          input.out,
          omega_r(input.ctx, input.out, s, d),
        );
      }
      case "write": {
        const m = applyMods<{ bold_s: ServiceAccount }>(
          input.ctx,
          { bold_s: input.out },
          omega_w(input.ctx, input.out, s),
        );
        return {
          ctx: m.ctx,
          out: m.out.bold_s,
        };
      }
      case "gas": {
        return applyMods(input.ctx, input.out, omega_g(input.ctx));
      }
      case "info": {
        const res = omega_i(input.ctx, s, d);
        return applyMods(input.ctx, input.out, res);
      }
      default:
        return applyMods(input.ctx, input.out, [
          IxMod.gas(10n),
          IxMod.reg(7, HostCallResult.WHAT),
        ]);
    }
  };
