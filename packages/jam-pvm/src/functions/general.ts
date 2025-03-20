import { regFn } from "@/functions/fnsdb.js";
import {
  Blake2bHash,
  Delta,
  Gas,
  Hash,
  PVMExitPanicMod,
  PVMSingleModMemory,
  PVMSingleModObject,
  ServiceAccount,
  ServiceIndex,
  u8,
} from "@tsjam/types";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { Hashing } from "@tsjam/crypto";
import { HostCallResult } from "@tsjam/constants";
import {
  Blake2bHashCodec,
  E_4_int,
  encodeWithCodec,
  HashCodec,
  HashJSONCodec,
  Uint8ArrayJSONCodec,
} from "@tsjam/codec";
import { serviceAccountGasThreshold } from "@tsjam/utils";
import { W7, W8 } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";
import assert from "node:assert";

/**
 * `ΩG`
 */
export const omega_g = regFn<[], W7 | W8>({
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

/**
 * `ΩL`
 */
export const omega_l = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, delta: Delta],
  PVMExitPanicMod | W7 | PVMSingleModMemory
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
      const [h, o] = context.registers.slice(8);

      let hash: Blake2bHash;
      if (context.memory.canRead(toSafeMemoryAddress(h), 32)) {
        hash = Blake2bHashCodec.decode(
          context.memory.getBytes(toSafeMemoryAddress(h), 32),
        ).value;
      } else {
        // v = ∇
        return [IxMod.panic()];
      }
      if (typeof a === "undefined" || !a.preimage_p.has(hash)) {
        // we can't either read memory or `a` cannot be set or the preimage has not the hash we're looking for
        return [IxMod.w7(HostCallResult.NONE)];
      }

      const v = a.preimage_p.get(hash)!;

      const w10 = context.registers[10];
      const w11 = context.registers[11];

      const vLength = BigInt(v.length);
      // start
      const f = w10 < vLength ? w10 : vLength;
      // length
      const l = w11 < vLength - f ? w11 : vLength - f;

      // this is not ingraypaper  but it's a good idea to check if the sum of the two values is less than 2^32
      assert(o + l < 2 ** 32, "o+l must not exceed 2^32");

      if (!context.memory.canWrite(toSafeMemoryAddress(o), Number(l))) {
        return [IxMod.panic()];
      }
      return [
        IxMod.w7(v.length),
        IxMod.memory(o, v.subarray(Number(f), Number(l))),
      ];
    },
  },
});

/**
 * `ΩR`
 */
export const omega_r = regFn<
  [Xs: ServiceAccount, s: ServiceIndex, delta: Delta],
  PVMExitPanicMod | W7 | PVMSingleModMemory
>({
  fn: {
    opCode: 2 as u8,
    identifier: "read",
    gasCost: 10n as Gas,
    execute(context, bold_s: ServiceAccount, s: ServiceIndex, d: Delta) {
      console.log("READ", s);
      const w7 = context.registers[7];
      let s_star = s;
      if (w7 !== 2n ** 64n - 1n) {
        s_star = <ServiceIndex>Number(w7);
      }
      assert(s_star < 2 ** 32, "service index not in bounds");

      console.log("READ s*", s_star);
      let a: ServiceAccount | undefined;
      if (s_star === s) {
        a = bold_s;
      } else if (d.has(s_star)) {
        console.log("qui");
        a = d.get(s_star)!;
      } else {
        console.log("porcodio");
      }

      const [ko, kz, o, w11, w12] = context.registers.slice(8);
      if (!context.memory.canRead(toSafeMemoryAddress(ko), Number(kz))) {
        return [IxMod.panic()];
      }
      // compute k
      const tmp = new Uint8Array(4 + Number(kz));
      E_4_int.encode(s_star, tmp);
      tmp.set(context.memory.getBytes(toSafeMemoryAddress(ko), Number(kz)), 4);
      const k = Hashing.blake2b(tmp);
      console.log("READ key=", HashJSONCodec().toJSON(k));

      const v = a?.storage.get(k);
      if (typeof v === "undefined") {
        console.log("diomerda");
        // either a is undefined or no key in storage
        return [IxMod.w7(HostCallResult.NONE)];
      }

      const f = w11 < v.length ? Number(w11) : v.length;
      const l = w12 < v.length - f ? Number(w12) : v.length - f;
      return [IxMod.w7(v.length), IxMod.memory(o, v.subarray(f, f + l))];
    },
  },
});

/**
 * `ΩW`
 */
export const omega_w = regFn<
  [bold_s: ServiceAccount, s: ServiceIndex],
  PVMExitPanicMod | W7 | PVMSingleModObject<{ bold_s: ServiceAccount }>
>({
  fn: {
    opCode: 3 as u8,
    identifier: "write",
    gasCost: 10n as Gas,
    execute(context, bold_s: ServiceAccount, s: ServiceIndex) {
      const [k0, kz, v0, vz] = context.registers.slice(7);
      let k: Hash;
      if (
        !context.memory.canRead(toSafeMemoryAddress(k0), Number(kz)) ||
        !context.memory.canRead(toSafeMemoryAddress(v0), Number(vz))
      ) {
        return [IxMod.panic()];
      } else {
        k = Hashing.blake2b(
          new Uint8Array([
            ...encodeWithCodec(E_4_int, s),
            ...context.memory.getBytes(toSafeMemoryAddress(k0), Number(kz)),
          ]),
        );
      }
      const a: ServiceAccount = {
        ...bold_s,
        storage: new Map(bold_s.storage),
      };
      if (vz === 0n) {
        // write in red delleting key
        console.log(
          "\x1b[36m deleting key",
          HashJSONCodec().toJSON(k),
          "\x1b[0m",
          s,
        );
        a.storage.delete(k);
      } else {
        console.log(
          "\x1b[36m writing key",
          HashJSONCodec().toJSON(k),
          "\x1b[0m",
          s,
          Uint8ArrayJSONCodec.toJSON(
            context.memory.getBytes(toSafeMemoryAddress(v0), Number(vz)),
          ),
        );
        a.storage.set(
          k,
          context.memory.getBytes(toSafeMemoryAddress(v0), Number(vz)),
        );
      }

      let l: number | bigint;
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

/**
 * `ΩI`
 */
export const omega_i = regFn<
  [s: ServiceIndex, d: Delta],
  W7 | PVMSingleModMemory
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
      if (!context.memory.canWrite(toSafeMemoryAddress(o), m.length)) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        return [IxMod.w7(HostCallResult.OK), IxMod.memory(o, m)];
      }
    },
  },
});
