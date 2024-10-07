import { regFn } from "@/functions/fnsdb.js";
import {
  Blake2bHash,
  Dagger,
  Delta,
  Hash,
  PVMResultContext,
  PVMSingleModMemory,
  PVMSingleModObject,
  ServiceAccount,
  ServiceIndex,
  u8,
} from "@tsjam/types";
import { Hashing } from "@tsjam/crypto";
import { HostCallResult } from "@tsjam/constants";
import { E_4 } from "@tsjam/codec";
import { serviceAccountGasThreshold } from "@tsjam/utils";
import { W0, W1 } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";

/**
 * `ΩG`
 */
export const omega_g = regFn<[], [W0, W1]>({
  fn: {
    opCode: 0 as u8,
    identifier: "gas",
    gasCost: 10n,
    execute(context) {
      const p_gas = context.gas - (this.gasCost as bigint);
      return [
        IxMod.w0(Number(p_gas % BigInt(2 ** 32))),
        IxMod.w1(Number(p_gas / BigInt(2 ** 32))),
      ];
    },
  },
});

export const omega_l = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, dag_delta: Dagger<Delta>],
  [W0, PVMSingleModMemory] | [W0]
>({
  fn: {
    opCode: 1 as u8,
    identifier: "lookup",
    gasCost: 10n,
    execute(
      context,
      bold_s: ServiceAccount,
      s: ServiceIndex,
      d: Dagger<Delta>,
    ) {
      let a: ServiceAccount | undefined;
      const w0 = context.registers[0];
      if (w0 === s || w0 === 2 ** 32 - 1) {
        a = bold_s;
      } else {
        a = d.get(w0 as ServiceIndex);
      }
      const [h0, b0, bz] = context.registers.slice(1);
      let h: Blake2bHash | undefined;
      if (!context.memory.canRead(h0, 32)) {
        h = undefined;
      } else {
        h = Hashing.blake2b(context.memory.getBytes(h0, 32));
      }

      const v =
        typeof a !== "undefined" &&
        typeof h !== "undefined" &&
        a.preimage_p.has(h)
          ? a.preimage_p.get(h)
          : undefined;

      if (!context.memory.canWrite(b0, bz + b0)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      if (typeof v === "undefined") {
        return [IxMod.w0(HostCallResult.NONE)];
      }
      return [
        IxMod.w0(v.length),
        IxMod.memory(b0, v.subarray(0, Math.min(v.length, bz))),
      ];
    },
  },
});

export const omega_r = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, dag_delta: Dagger<Delta>],
  [W0, PVMSingleModMemory] | [W0]
>({
  fn: {
    opCode: 2 as u8,
    identifier: "read",
    gasCost: 10n,
    execute(
      context,
      bold_s: ServiceAccount,
      s: ServiceIndex,
      d: Dagger<Delta>,
    ) {
      let a: ServiceAccount | undefined;
      const [w0, k0, kz, b0, bz] = context.registers;
      if (w0 === s || w0 === 2 ** 32 - 1) {
        a = bold_s;
      } else {
        a = d.get(w0 as ServiceIndex);
      }
      let k: Hash;
      if (!context.memory.canRead(k0, kz) || !context.memory.canWrite(b0, bz)) {
        return [IxMod.w0(HostCallResult.OOB)];
      } else {
        const tmp = new Uint8Array(4);
        E_4.encode(BigInt(s), tmp);
        k = Hashing.blake2b(
          new Uint8Array([...tmp, ...context.memory.getBytes(k0, kz)]),
        );
      }
      let v: Uint8Array;
      if (typeof a !== "undefined" && a.storage.has(k)) {
        v = a.storage.get(k)!;
      } else {
        return [IxMod.w0(HostCallResult.NONE)];
      }

      return [
        IxMod.w0(v.length),
        IxMod.memory(b0, v.subarray(0, Math.min(v.length, bz))),
      ];
    },
  },
});

export const omega_w = regFn<
  [bold_s: ServiceAccount, s: ServiceIndex],
  Array<W0 | PVMSingleModObject<{ bold_s: ServiceAccount }>>
>({
  fn: {
    opCode: 3 as u8,
    identifier: "write",
    gasCost: 10n,
    execute(context, bold_s: ServiceAccount, s: ServiceIndex) {
      const [k0, kz, v0, vz] = context.registers.slice(0, 4);
      let k: Hash;
      if (!context.memory.canRead(k0, kz) || !context.memory.canRead(v0, vz)) {
        return [IxMod.w0(HostCallResult.OOB)];
      } else {
        const tmp = new Uint8Array(4);
        E_4.encode(BigInt(s), tmp);
        k = Hashing.blake2b(
          new Uint8Array([...tmp, ...context.memory.getBytes(k0, kz)]),
        );
      }
      const a: ServiceAccount = {
        ...bold_s,
        storage: new Map(bold_s.storage),
      };
      if (vz === 0) {
        a.storage.delete(k);
      } else {
        a.storage.set(k, context.memory.getBytes(v0, vz));
      }

      let l: number;
      if (bold_s.storage.has(k)) {
        const at = serviceAccountGasThreshold(bold_s);
        if (at > a.balance) {
          return [IxMod.w0(HostCallResult.FULL)];
        }
        l = bold_s.storage.get(k)!.length;
      } else {
        l = HostCallResult.NONE;
      }
      return [IxMod.w0(l), IxMod.obj({ bold_s: a })];
    },
  },
});

export const omega_i = regFn<
  [
    Xs: ServiceAccount,
    s: ServiceIndex,
    dag_delta: Dagger<Delta>,
    xn: PVMResultContext["n"],
  ],
  [W0, PVMSingleModMemory] | [W0]
>({
  fn: {
    opCode: 4 as u8,
    identifier: "info",
    gasCost: 10n,
    execute(
      context,
      bold_s: ServiceAccount,
      s: ServiceIndex,
      d: Dagger<Delta>,
      xn: PVMResultContext["n"],
    ) {
      const w0 = context.registers[0];
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
          return [IxMod.w0(HostCallResult.NONE)];
        }
      }
      const o = context.registers[1];
      const m = new Uint8Array(32); //TODO encode of t
      if (!context.memory.canWrite(o, m.length)) {
        return [IxMod.w0(HostCallResult.OOB)];
      } else {
        return [IxMod.w0(HostCallResult.OK), IxMod.memory(o, m)];
      }
    },
  },
});
