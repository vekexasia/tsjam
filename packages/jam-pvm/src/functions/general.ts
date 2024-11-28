import { regFn } from "@/functions/fnsdb.js";
import {
  Blake2bHash,
  Delta,
  Gas,
  Hash,
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
import { W7, W8 } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";

/**
 * `ΩG`
 */
export const omega_g = regFn<[], [W7, W8]>({
  fn: {
    opCode: 0 as u8,
    identifier: "gas",
    gasCost: 10n as Gas,
    execute(context) {
      const p_gas = context.gas - (this.gasCost as bigint);
      return [
        IxMod.w7(Number(p_gas % BigInt(2 ** 32))),
        IxMod.w8(Number(p_gas / BigInt(2 ** 32))),
      ];
    },
  },
});

export const omega_l = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, delta: Delta],
  Array<W7 | PVMSingleModMemory>
>({
  fn: {
    opCode: 1 as u8,
    identifier: "lookup",
    gasCost: 10n as Gas,
    execute(context, bold_s: ServiceAccount, s: ServiceIndex, d: Delta) {
      let a: ServiceAccount | undefined;
      const w7 = context.registers[7];
      if (Number(w7) === s || w7 === 2n ** 64n - 1n) {
        a = bold_s;
      } else {
        a = d.get(Number(w7) as ServiceIndex);
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
        return [IxMod.w7(HostCallResult.OOB)];
      }
      if (typeof v === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }
      return [
        IxMod.w7(v.length),
        IxMod.memory(b0, v.subarray(0, Math.min(v.length, Number(bz)))),
      ];
    },
  },
});

export const omega_r = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, delta: Delta],
  Array<W7 | PVMSingleModMemory>
>({
  fn: {
    opCode: 2 as u8,
    identifier: "read",
    gasCost: 10n as Gas,
    execute(context, bold_s: ServiceAccount, s: ServiceIndex, d: Delta) {
      let a: ServiceAccount | undefined;
      const w7 = context.registers[7];
      const [k0, kz, b0, bz] = context.registers.slice(8);
      if (Number(w7) === s || w7 === 2n ** 64n - 1n) {
        a = bold_s;
      } else {
        a = d.get(Number(w7) as ServiceIndex);
      }
      let k: Hash;
      if (!context.memory.canRead(k0, kz) || !context.memory.canWrite(b0, bz)) {
        return [IxMod.w7(HostCallResult.OOB)];
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
        return [IxMod.w7(HostCallResult.NONE)];
      }

      return [
        IxMod.w7(v.length),
        IxMod.memory(b0, v.subarray(0, Math.min(v.length, Number(bz)))),
      ];
    },
  },
});

export const omega_w = regFn<
  [bold_s: ServiceAccount, s: ServiceIndex],
  Array<W7 | PVMSingleModObject<{ bold_s: ServiceAccount }>>
>({
  fn: {
    opCode: 3 as u8,
    identifier: "write",
    gasCost: 10n as Gas,
    execute(context, bold_s: ServiceAccount, s: ServiceIndex) {
      const [k0, kz, v0, vz] = context.registers.slice(7);
      let k: Hash;
      if (!context.memory.canRead(k0, kz) || !context.memory.canRead(v0, vz)) {
        return [IxMod.w7(HostCallResult.OOB)];
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
      if (vz === 0n) {
        a.storage.delete(k);
      } else {
        a.storage.set(k, context.memory.getBytes(v0, vz));
      }

      let l: number;
      if (bold_s.storage.has(k)) {
        const at = serviceAccountGasThreshold(bold_s);
        if (at > a.balance) {
          return [IxMod.w7(HostCallResult.FULL)];
        }
        l = bold_s.storage.get(k)!.length;
      } else {
        l = HostCallResult.NONE;
      }
      return [IxMod.w7(l), IxMod.obj({ bold_s: a })];
    },
  },
});

export const omega_i = regFn<
  [s: ServiceIndex, d: Delta],
  Array<W7 | PVMSingleModMemory>
>({
  fn: {
    opCode: 4 as u8,
    identifier: "info",
    gasCost: 10n as Gas,
    execute(context, s: ServiceIndex, d: Delta) {
      const w7 = context.registers[7];
      let t: ServiceAccount | undefined;
      if (w7 === 2n ** 64n - 1n) {
        t = d.get(s);
      } else {
        t = d.get(Number(w7) as ServiceIndex);
      }
      if (typeof t === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }
      const o = context.registers[8];
      const m = new Uint8Array(32); //TODO encode of t
      if (!context.memory.canWrite(o, m.length)) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        return [IxMod.w7(HostCallResult.OK), IxMod.memory(o, m)];
      }
    },
  },
});
