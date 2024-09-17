import { regFn } from "@/functions/fnsdb.js";
import {
  Blake2bHash,
  Dagger,
  Delta,
  PVMProgramExecutionContextBase,
  ServiceAccount,
  ServiceIndex,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { Hashing } from "@vekexasia/jam-crypto";
import { HostCallResult } from "@vekexasia/jam-constants";
import {E_4} from "@vekexasia/jam-codec";

/**
 * `ΩG`
 */
export const gamma_g = regFn<[]>({
  opCode: 0 as u8,
  identifier: "gas",
  fn: {
    gasCost: 10n,
    execute(context: { execution: PVMProgramExecutionContextBase }) {
      const p_gas = context.execution.gas - this.gasCost;
      return {
        ...context.execution,
        registers: [
          p_gas % BigInt(2 ** 32),
          p_gas / BigInt(2 ** 32),
          ...context.execution.registers.slice(2),
        ] as PVMProgramExecutionContextBase["registers"],
      };
    },
  },
});

export const gamma_l = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, dag_delta: Dagger<Delta>]
>({
  opCode: 1 as u8,
  identifier: "lookup",
  fn: {
    gasCost: 10n,
    execute(
      context: { execution: PVMProgramExecutionContextBase },
      bold_s: ServiceAccount,
      s: ServiceIndex,
      d: Dagger<Delta>,
    ) {
      let a: ServiceAccount | undefined;
      const w0 = context.execution.registers[0];
      if (w0 === s || w0 === 2 ** 32 - 1) {
        a = bold_s;
      } else {
        a = d.get(w0 as ServiceIndex);
      }
      const [h0, b0, bz] = context.execution.registers.slice(1);
      let h: Blake2bHash | undefined;
      if (!context.execution.memory.canRead(h0, 32)) {
        h = undefined;
      } else {
        h = Hashing.blake2b(context.execution.memory.getBytes(h0, 32));
      }

      const v =
        typeof a !== "undefined" &&
        typeof h !== "undefined" &&
        a.preimage_p.has(h)
          ? a.preimage_p.get(h)
          : undefined;

      let p_w0: u32;
      if (
        typeof h !== "undefined" &&
        context.execution.memory.canWrite(b0, bz + b0)
      ) {
        if (typeof v === "undefined") {
          p_w0 = HostCallResult.NONE as number as u32;
        } else {
          context.execution.memory.setBytes(
            b0,
            v.subarray(0, Math.min(v.length, bz)),
          );
          p_w0 = v.length as u32;
        }
      } else {
        p_w0 = HostCallResult.OOB as number as u32;
      }

      return {
        ...context.execution,
        registers: [
          p_w0,
          ...context.execution.registers.slice(1),
        ] as PVMProgramExecutionContextBase["registers"],
      };
    },
  },
});

export const gamma_r = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, dag_delta: Dagger<Delta>]
>({
  opCode: 2 as u8,
  identifier: "read",
  fn: {
    gasCost: 10n,
    execute(
      context: { execution: PVMProgramExecutionContextBase },
      bold_s: ServiceAccount,
      s: ServiceIndex,
      d: Dagger<Delta>,
    ) {
      let a: ServiceAccount | undefined;
      const w0 = context.execution.registers[0];
      if (w0 === s || w0 === 2 ** 32 - 1) {
        a = bold_s;
      } else {
        a = d.get(w0 as ServiceIndex);
      }
      const [k0, kz, b0, bz] = context.execution.registers.slice(1);
      E_4.encode(BigInt(s))
     },
  },
});
