import {
  Dagger,
  DeferredTransfer,
  Delta,
  Gas,
  Posterior,
  PVMProgramCode,
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
import { serviceAccountMetadataAndCode } from "@tsjam/serviceaccounts";
import { toTagged } from "@tsjam/utils";

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
 * $(0.6.4 - B.15)
 */
export const transferInvocation = (
  d: Delta,
  t: Tau,
  s: ServiceIndex,
  transfers: DeferredTransfer[],
): [ServiceAccount, Gas] => {
  let bold_s = d.get(s)!;

  console.log("transfer", transfers);
  assert(typeof bold_s !== "undefined", "Service not found in delta");
  bold_s = {
    ...bold_s,
    balance: (bold_s.balance +
      transfers.reduce((acc, a) => acc + a.amount, 0n)) as u64,
  };
  assert(bold_s.balance >= 0, "Balance cannot be negative");

  const { code } = serviceAccountMetadataAndCode(bold_s);
  if (typeof code === "undefined" || transfers.length === 0) {
    return [bold_s, <Gas>0n];
  }

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

  return [out.out, <Gas>0n];
};

/**
 * $(0.6.4 - B.16)
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

/**
 * $(0.6.4 - 12.26) | R
 */
export const filterTransfersByDestination = (
  bold_t: DeferredTransfer[],
  destination: ServiceIndex,
) => {
  return bold_t
    .slice()
    .sort((a, b) => {
      if (a.sender === b.sender) {
        return a.destination - b.destination;
      }
      return a.sender - b.sender;
    })
    .filter((t) => t.destination === destination);
};

export type InvokedTransfers = Map<
  ServiceIndex,
  ReturnType<typeof transferInvocation>
>;

/**
 * computes bold_x
 * $(0.6.4 - 12.27)
 */
export const invokeOntransfers = (
  transfers: DeferredTransfer[],
  d_delta: Dagger<Delta>,
  p_tau: Posterior<Tau>,
) => {
  const x: InvokedTransfers = toTagged(new Map());

  for (const [serviceIndex] of d_delta) {
    x.set(
      serviceIndex,
      transferInvocation(
        d_delta,
        p_tau,
        serviceIndex,
        filterTransfersByDestination(transfers, serviceIndex),
      ),
    );
  }
  return x;
};
/**
 * computes big bold X
 * $(0.6.4 - 12.29 / 12.30)
 */
export const transferStatistics = (
  bold_t: DeferredTransfer[],
  bold_x: InvokedTransfers,
): Map<ServiceIndex, { count: u32; usedGas: Gas }> => {
  const toRet = new Map<ServiceIndex, { count: u32; usedGas: Gas }>();
  for (const [destService, [, usedGas]] of bold_x) {
    const r = filterTransfersByDestination(bold_t, destService);
    if (r.length > 0) {
      toRet.set(destService, {
        // u
        usedGas,
        count: <u32>r.length,
      });
    }
  }
  return toRet;
};
