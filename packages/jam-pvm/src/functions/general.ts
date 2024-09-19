import { regFn } from "@/functions/fnsdb.js";
import {
  Blake2bHash,
  Dagger,
  Delta,
  Hash,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  ServiceAccount,
  ServiceIndex,
  u32,
  u8,
} from "@vekexasia/jam-types";
import { Hashing } from "@vekexasia/jam-crypto";
import { HostCallResult } from "@vekexasia/jam-constants";
import { E_4 } from "@vekexasia/jam-codec";
import { computeServiceAccountThreshold } from "@vekexasia/jam-utils";
import { fnReturn } from "@/functions/utils.js";

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
      return fnReturn(context.execution, {
        w0: p_gas % BigInt(2 ** 32),
        w1: p_gas / BigInt(2 ** 32),
      });
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
      let k: Hash;
      if (
        !context.execution.memory.canRead(k0, kz) ||
        !context.execution.memory.canWrite(b0, bz)
      ) {
        return fnReturn(context.execution, { w0: HostCallResult.OOB });
      } else {
        const tmp = new Uint8Array(4);
        E_4.encode(BigInt(s), tmp);
        k = Hashing.blake2b(
          new Uint8Array([
            ...tmp,
            ...context.execution.memory.getBytes(k0, kz),
          ]),
        );
      }
      let v: Uint8Array | undefined;
      if (typeof a !== "undefined") {
        v = a.storage.get(k);
      } else {
        v = undefined;
      }

      return fnReturn(context.execution, {
        w0: v?.length ?? HostCallResult.NONE,
      });
    },
  },
});

export const gamma_w = regFn<
  [bold_s: ServiceAccount, s: ServiceIndex],
  { p_bold_s: ServiceAccount }
>({
  opCode: 3 as u8,
  identifier: "write",
  fn: {
    gasCost: 10n,
    execute(
      context: { execution: PVMProgramExecutionContextBase },
      bold_s: ServiceAccount,
      s: ServiceIndex,
    ) {
      const [k0, kz, v0, vz] = context.execution.registers.slice(0, 4);
      let k: Hash;
      if (
        !context.execution.memory.canRead(k0, kz) ||
        !context.execution.memory.canRead(v0, vz)
      ) {
        return fnReturn(
          context.execution,
          { w0: HostCallResult.OOB },
          { p_bold_s: bold_s },
        );
      } else {
        const tmp = new Uint8Array(4);
        E_4.encode(BigInt(s), tmp);
        k = Hashing.blake2b(
          new Uint8Array([
            ...tmp,
            ...context.execution.memory.getBytes(k0, kz),
          ]),
        );
      }
      const a: ServiceAccount = {
        ...bold_s,
        storage: new Map(bold_s.storage),
      };
      if (vz === 0) {
        a.storage.delete(k);
      } else {
        a.storage.set(k, context.execution.memory.getBytes(v0, vz));
      }

      let l: number;
      if (bold_s.storage.has(k)) {
        const at = computeServiceAccountThreshold(bold_s);
        if (at > a.balance) {
          return fnReturn(
            context.execution,
            { w0: HostCallResult.FULL },
            { p_bold_s: bold_s },
          );
        }
        l = bold_s.storage.get(k)!.length;
      } else {
        l = HostCallResult.NONE;
      }
      return fnReturn(context.execution, { w0: l }, { p_bold_s: a });
    },
  },
});

export const gamma_i = regFn<
  [
    Xs: ServiceAccount,
    s: ServiceIndex,
    dag_delta: Dagger<Delta>,
    xn: PVMResultContext["n"],
  ]
>({
  opCode: 4 as u8,
  identifier: "info",
  fn: {
    gasCost: 10n,
    execute(
      context: { execution: PVMProgramExecutionContextBase },
      bold_s: ServiceAccount,
      s: ServiceIndex,
      d: Dagger<Delta>,
      xn: PVMResultContext["n"],
    ): PVMProgramExecutionContextBase {
      const w0 = context.execution.registers[0];
      let t: ServiceAccount;
      if (w0 === s || w0 === 2 ** 32 - 1) {
        t = bold_s;
      } else {
        if (xn.has(w0 as ServiceIndex)) {
          t = xn.get(w0 as ServiceIndex)!;
        } else if (d.has(w0 as ServiceIndex)) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          t = d.get(w0 as ServiceIndex)!;
        } else {
          return fnReturn(context.execution, { w0: HostCallResult.NONE });
        }
      }
      const o = context.execution.registers[1];
      const m = new Uint8Array(32); //TODO encode of t
      if (!context.execution.memory.canWrite(o, m.length)) {
        return fnReturn(context.execution, { w0: HostCallResult.OOB });
      } else {
        context.execution.memory.setBytes(o, m);
        return fnReturn(context.execution, { w0: HostCallResult.OK });
      }
    },
  },
});
