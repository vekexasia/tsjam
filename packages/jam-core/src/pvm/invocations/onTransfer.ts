import { DeferredTransfersImpl } from "@/classes/DeferredTransfersImpl";
import { DeltaImpl } from "@/classes/DeltaImpl";
import { InvokedTransferResultImpl } from "@/classes/InvokedTransferResultImpl";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import { createCodec, E_int, encodeWithCodec } from "@tsjam/codec";
import { HostCallResult, SERVICECODE_MAX_SIZE } from "@tsjam/constants";
import {
  Balance,
  Gas,
  PVMProgramExecutionContext,
  ServiceIndex,
  Tau,
  u32,
  u8,
} from "@tsjam/types";
import assert from "node:assert";
import { FnsDb } from "../functions/fnsdb";
import {
  omega_g,
  omega_i,
  omega_l,
  omega_r,
  omega_w,
  omega_y,
} from "../functions/general";
import { applyMods } from "../functions/utils";
import { IxMod } from "../instructions/utils";
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./hostCall";

const argumentInvocationTransferCodec = createCodec<{
  tau: Tau;
  serviceIndex: ServiceIndex;
  transfersLength: number;
}>([
  ["tau", E_int<Tau>()],
  ["serviceIndex", E_int<ServiceIndex>()],
  ["transfersLength", E_int()],
]);
/**
 * $(0.6.5 - B.15)
 */
export const transferInvocation = (
  d: DeltaImpl,
  t: Tau,
  s: ServiceIndex,
  transfers: DeferredTransfersImpl, // bold_t
): InvokedTransferResultImpl => {
  let bold_s = <ServiceAccountImpl>d.get(s)!;

  assert(typeof bold_s !== "undefined", "Service not found in delta");
  bold_s = new ServiceAccountImpl({
    ...bold_s,
    balance: <Balance>(bold_s.balance + transfers.totalAmount()),
  });
  assert(bold_s.balance >= 0, "Balance cannot be negative");

  const code = bold_s.code();
  if (
    typeof code === "undefined" ||
    code.length > SERVICECODE_MAX_SIZE ||
    transfers.length() === 0
  ) {
    return new InvokedTransferResultImpl({ account: bold_s, gasUsed: <Gas>0n });
  }

  const out = argumentInvocation(
    code,
    10 as u32,
    transfers.totalGasUsed(),
    encodeWithCodec(argumentInvocationTransferCodec, {
      tau: t,
      serviceIndex: s,
      transfersLength: transfers.elements.length,
    }),
    F_fn(d, s),
    bold_s,
  );

  return new InvokedTransferResultImpl({
    account: out.out,
    gasUsed: out.gasUsed,
  });
};

/**
 * $(0.6.4 - B.16)
 */
const F_fn: (
  d: DeltaImpl,
  s: ServiceIndex,
) => HostCallExecutor<ServiceAccountImpl> =
  (d: DeltaImpl, s: ServiceIndex) =>
  (input: {
    hostCallOpcode: u8;
    ctx: PVMProgramExecutionContext;
    out: ServiceAccountImpl;
  }) => {
    const fnIdentifier = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fnIdentifier) {
      case "gas": {
        return applyMods(input.ctx, input.out, omega_g(input.ctx));
      }
      case "fetch": {
        // @ts-ignore FIXME:
        return applyMods(input.ctx, input.out, omega_y(input.ctx));
      }

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
        const m = applyMods<{ bold_s: ServiceAccountImpl }>(
          input.ctx,
          { bold_s: input.out },
          omega_w(input.ctx, input.out, s),
        );
        return {
          ctx: m.ctx,
          out: m.out.bold_s,
        };
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
