import { regFn } from "@/functions/fnsdb.js";
import {
  Blake2bHash,
  Delta,
  ExportSegment,
  Gas,
  Hash,
  PVMExitPanicMod,
  PVMSingleModMemory,
  PVMSingleModObject,
  ServiceAccount,
  ServiceIndex,
  u32,
  u64,
  u8,
  WorkPackageWithAuth,
} from "@tsjam/types";
import { toSafeMemoryAddress } from "@/pvmMemory";
import { Hashing } from "@tsjam/crypto";
import { HostCallResult } from "@tsjam/constants";
import {
  Blake2bHashCodec,
  CodeHashCodec,
  createCodec,
  E_4_int,
  E_8,
  E_sub,
  encodeWithCodec,
  HashJSONCodec,
  Uint8ArrayJSONCodec,
} from "@tsjam/codec";
import { W7, W8 } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";
import assert from "node:assert";
import {
  serviceAccountGasThreshold,
  serviceAccountItemInStorage,
  serviceAccountTotalOctets,
} from "@tsjam/serviceaccounts";

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
 * `ΩY` in the graypaper
 * fetch
 */
export const omega_y = regFn<
  [
    workItemIndex: number, // i
    workPackage: WorkPackageWithAuth, // p
    authOutput: Uint8Array, // bold_o
    t: ExportSegment[][], // \overline_i
  ],
  W7 | PVMSingleModMemory | PVMExitPanicMod
>({
  fn: {
    opCode: 18 as u8,
    identifier: "fetch",
    gasCost: 10n as Gas,
    execute(context, i, p, bold_o, t) {
      // FIXME:bring me to 0.6.6
      return [];
      // const [o, w8, w9, w10, w11, w12] = context.registers.slice(7);
      // const _w11 = Number(w11);
      // const _w12 = Number(w12);

      // let v: Uint8Array | undefined;
      // if (w10 === 0n) {
      //   v = encodeWithCodec(WorkPackageCodec, p);
      // } else if (w10 === 1n) {
      //   v = bold_o;
      // } else if (w10 === 2n && w11 < p.items.length) {
      //   v = p.items[_w11].payload;
      // } else if (
      //   w10 === 3n &&
      //   w11 < p.items.length &&
      //   w12 < p.items[_w11].exportedDataSegments.length &&
      //   false /* TODO: boldx is a datastore we should keep to fetch data */
      // ) {
      // } else if (
      //   w10 === 4n &&
      //   w11 < p.items[i].exportedDataSegments.length &&
      //   false /* TODO: see above */
      // ) {
      // } else if (
      //   w10 === 5n &&
      //   w11 < overline_i.length &&
      //   w12 < overline_i[_w11].length
      // ) {
      //   v = overline_i[_w11][_w12];
      // } else if (w10 === 6n && w11 < overline_i[i].length) {
      //   v = overline_i[i][_w11];
      // } else if (w10 === 7n) {
      //   v = p.paramsBlob;
      // }

      // const f = Math.min(Number(w8), (v || []).length);
      // const l = Math.min(Number(w9), (v || []).length - f);
      // let memory: PVMSingleModMemory[] = [];
      // if (
      //   typeof v !== "undefined" &&
      //   context.memory.canWrite(toSafeMemoryAddress(o), l)
      // ) {
      //   memory = [IxMod.memory(o, v.subarray(f, l))];
      // }

      // if (
      //   !context.memory.canRead(toSafeMemoryAddress(o), l) ||
      //   (w9 == 5n && context.memory.canRead(toSafeMemoryAddress(w10), 32))
      // ) {
      //   return [...memory, IxMod.panic()];
      // }

      // if (typeof v === "undefined") {
      //   return [IxMod.w7(HostCallResult.NONE)];
      // }
      // return [IxMod.w7(v.length)];
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
      const w7 = context.registers[7];
      let s_star = s;
      if (w7 !== 2n ** 64n - 1n) {
        s_star = <ServiceIndex>Number(w7);
      }
      assert(s_star < 2 ** 32, "service index not in bounds");

      let a: ServiceAccount | undefined;
      if (s_star === s) {
        a = bold_s;
      } else if (d.has(s_star)) {
        a = d.get(s_star)!;
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

      const v = a?.storage.get(k);
      if (typeof v === "undefined") {
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
      if (!context.memory.canRead(toSafeMemoryAddress(k0), Number(kz))) {
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
      } else if (context.memory.canRead(toSafeMemoryAddress(v0), Number(vz))) {
        // second bracket
        console.log(
          "\x1b[36m writing key",
          HashJSONCodec().toJSON(k),
          "\x1b[0m",
          s,
          Uint8ArrayJSONCodec.toJSON(
            context.memory.getBytes(toSafeMemoryAddress(v0), Number(vz)),
          ),
          context.gas,
        );
        a.storage.set(
          k,
          context.memory.getBytes(toSafeMemoryAddress(v0), Number(vz)),
        );
      } else {
        return [IxMod.panic()];
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

const serviceAccountCodec = createCodec<
  ServiceAccount & { gasThreshold: Gas; totalOctets: u64; itemInStorage: u32 }
>([
  ["codeHash", CodeHashCodec], // c
  ["balance", E_sub<u64>(8)], // b
  ["gasThreshold", E_sub<Gas>(8)], // t - virutal element
  ["minGasAccumulate", E_sub<Gas>(8)], // g
  ["minGasOnTransfer", E_sub<Gas>(8)], // m
  ["totalOctets", E_sub<u64>(8)], // o - virtual element
  ["itemInStorage", E_4_int], // i - virtual element
]);
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
      let bold_t: ServiceAccount | undefined;
      if (w7 === 2n ** 64n - 1n) {
        bold_t = d.get(s);
      } else {
        bold_t = d.get(Number(w7) as ServiceIndex);
      }
      if (typeof bold_t === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }
      const o = context.registers[8];
      const m = encodeWithCodec(serviceAccountCodec, {
        ...bold_t,
        gasThreshold: serviceAccountGasThreshold(bold_t),
        totalOctets: serviceAccountTotalOctets(bold_t),
        itemInStorage: serviceAccountItemInStorage(bold_t),
      });
      if (!context.memory.canWrite(toSafeMemoryAddress(o), m.length)) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        return [IxMod.w7(HostCallResult.OK), IxMod.memory(o, m)];
      }
    },
  },
});
