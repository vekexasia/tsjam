import { DeferredTransfersImpl } from "@/impls/deferred-transfers-impl";
import { DeltaImpl } from "@/impls/delta-impl";
import { JamEntropyImpl } from "@/impls/jam-entropy-impl";
import { PVMProgramExecutionContextImpl } from "@/impls/pvm/pvm-program-execution-context-impl";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import {
  asCodec,
  createCodec,
  E_int,
  E_sub_int,
  encodeWithCodec,
} from "@tsjam/codec";
import { HostCallResult, SERVICECODE_MAX_SIZE } from "@tsjam/constants";
import { Balance, Gas, Posterior, ServiceIndex, u32, u8 } from "@tsjam/types";
import assert from "node:assert";
import { FnsDb } from "../functions/fnsdb";
import { hostFunctions } from "../functions/functions";
import { applyMods } from "../functions/utils";
import { IxMod } from "../instructions/utils";
import { argumentInvocation } from "./argument";
import { HostCallExecutor } from "./host-call";

const argumentInvocationTransferCodec = createCodec<{
  tau: SlotImpl;
  serviceIndex: ServiceIndex;
  transfersLength: number;
}>([
  ["tau", asCodec(SlotImpl)],
  ["serviceIndex", E_sub_int<ServiceIndex>(4)],
  ["transfersLength", E_int()],
]);
/**
 * $(0.6.5 - B.15)
 */
export const transferInvocation = (
  bold_d: DeltaImpl,
  t: TauImpl,
  s: ServiceIndex,
  transfers: DeferredTransfersImpl,
  deps: { p_eta_0: Posterior<JamEntropyImpl["_0"]> },
): { serviceAccount: ServiceAccountImpl; gasUsed: Gas } => {
  let bold_s = <ServiceAccountImpl>bold_d.get(s)!;

  assert(typeof bold_s !== "undefined", "Service not found in delta");
  bold_s = bold_s.clone();
  bold_s.balance = <Balance>(
    (bold_s.balance + transfers.elements.reduce((acc, a) => acc + a.amount, 0n))
  );
  assert(bold_s.balance >= 0, "Balance cannot be negative");

  const code = bold_s.code();
  if (
    typeof code === "undefined" ||
    code.length > SERVICECODE_MAX_SIZE ||
    transfers.length() === 0
  ) {
    return { serviceAccount: bold_s, gasUsed: <Gas>0n };
  }

  const out = argumentInvocation(
    code,
    10 as u32,
    transfers.totalGasUsed(),
    encodeWithCodec(argumentInvocationTransferCodec, {
      tau: t,
      serviceIndex: s,
      transfersLength: transfers.length(),
    }),
    F_fn({ p_eta_0: deps.p_eta_0, bold_d, s, bold_s, bold_t: transfers }),
    bold_s,
  );

  return { serviceAccount: out.out, gasUsed: out.gasUsed };
};

/**
 * $(0.6.4 - B.16)
 */
const F_fn: (deps: {
  bold_d: DeltaImpl;
  s: ServiceIndex;
  bold_s: ServiceAccountImpl;
  p_eta_0: Posterior<JamEntropyImpl["_0"]>;
  bold_t: DeferredTransfersImpl;
}) => HostCallExecutor<ServiceAccountImpl> =
  (deps: {
    bold_d: DeltaImpl;
    s: ServiceIndex;
    bold_s: ServiceAccountImpl;
    p_eta_0: Posterior<JamEntropyImpl["_0"]>;
    bold_t: DeferredTransfersImpl;
  }) =>
  (data: {
    hostCallOpcode: u8;
    ctx: PVMProgramExecutionContextImpl;
    out: ServiceAccountImpl;
  }) => {
    const { s, bold_s, bold_d } = deps;
    const fnIdentifier = FnsDb.byCode.get(data.hostCallOpcode)!;
    switch (fnIdentifier) {
      case "gas": {
        return applyMods(
          data.ctx,
          data.out,
          hostFunctions.gas(data.ctx, undefined),
        );
      }
      case "fetch": {
        return applyMods(
          data.ctx,
          data.out,
          hostFunctions.fetch(data.ctx, {
            n: deps.p_eta_0,
            bold_t: deps.bold_t,
          }),
        );
      }
      case "lookup": {
        return applyMods(
          data.ctx,
          data.out,
          hostFunctions.lookup(data.ctx, {
            bold_d,
            s,
            bold_s,
          }),
        );
      }
      case "read": {
        return applyMods(
          data.ctx,
          data.out,
          hostFunctions.read(data.ctx, {
            bold_d,
            s,
            bold_s,
          }),
        );
      }
      case "write": {
        const out = { bold_s: data.out };
        const m = applyMods<{ bold_s: ServiceAccountImpl }>(
          data.ctx,
          out,
          hostFunctions.write(data.ctx, {
            s,
            bold_s,
          }),
        );
        data.out = out.bold_s;
        return m;
      }
      case "info": {
        const res = hostFunctions.info(data.ctx, { s, bold_d });
        return applyMods(data.ctx, data.out, res);
      }
      default:
        return applyMods(data.ctx, data.out, [
          IxMod.gas(10n),
          IxMod.w7(HostCallResult.WHAT),
        ]);
    }
  };
