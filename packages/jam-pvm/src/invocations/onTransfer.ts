import {
  DeferredTransfer,
  Delta,
  PVMProgramExecutionContextBase,
  ServiceAccount,
  ServiceIndex,
  u32,
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
import { toTagged } from "@tsjam/utils";
import assert from "node:assert";
import { HostCallExecutor } from "./hostCall";

export const transferInvocation = (
  d: Delta,
  s: ServiceIndex,
  transfers: DeferredTransfer[],
): ServiceAccount => {
  let bold_s = d.get(s)!;

  assert(typeof bold_s !== "undefined", "Service not found in delta");
  bold_s = {
    ...bold_s,
    balance: bold_s.balance + transfers.reduce((acc, a) => acc + a.amount, 0n),
  };

  if (bold_s.codeHash || transfers.length === 0) {
    return bold_s;
  }

  const code = new Uint8Array(); //TODO: get preimage from bold_s.codeHash

  const out = argumentInvocation(
    code,
    15 as u32,
    toTagged(transfers.reduce((acc, a) => acc + a.gasLimit, 0n)),
    new Uint8Array(), // TODO: encode transfers
    F_fn(d, s),
    bold_s,
  );
  return out.out;
};

const F_fn: (d: Delta, s: ServiceIndex) => HostCallExecutor<ServiceAccount> =
  (d: Delta, s: ServiceIndex) =>
  (input: {
    hostCallOpcode: u8;
    ctx: PVMProgramExecutionContextBase;
    out: ServiceAccount;
  }) => {
    const fn = FnsDb.byCode.get(input.hostCallOpcode)!;
    switch (fn.identifier) {
      case "lookup": {
        return applyMods(
          input.ctx,
          input.out,
          omega_l.execute(input.ctx, input.out, s, d),
        );
      }
      case "read": {
        return applyMods(
          input.ctx,
          input.out,
          omega_r.execute(input.ctx, input.out, s, d),
        );
      }
      case "write": {
        const m = applyMods<{ bold_s: ServiceAccount }>(
          input.ctx,
          { bold_s: input.out },
          omega_w.execute(input.ctx, input.out, s),
        );
        return {
          ctx: m.ctx,
          out: m.out.bold_s,
        };
      }
      case "gas": {
        return applyMods(input.ctx, input.out, omega_g.execute(input.ctx));
      }
      case "info": {
        const res = omega_i.execute(input.ctx, s, d);
        return applyMods(input.ctx, input.out, res);
      }
      default:
        return {
          ctx: {
            ...input.ctx,
            gas: toTagged(input.ctx.gas - 10n),
            registers: [
              HostCallResult.WHAT,
              input.ctx.registers[8],
              ...new Array(11).fill(0),
            ] as PVMProgramExecutionContextBase["registers"],
          },
          out: input.out,
        };
    }
  };
