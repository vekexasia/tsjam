import { DeferredTransfersImpl } from "@/classes/DeferredTransfersImpl";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import {
  Blake2bHashCodec,
  CodeHashCodec,
  createCodec,
  E_sub,
  E_sub_int,
  encodeWithCodec,
  Uint8ArrayJSONCodec,
} from "@tsjam/codec";
import { HostCallResult } from "@tsjam/constants";
import {
  Balance,
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
  Tau,
  u32,
  u64,
  u8,
  WorkPackageWithAuth,
} from "@tsjam/types";
import assert from "node:assert";
import { IxMod } from "../instructions/utils";
import { toSafeMemoryAddress } from "../pvmMemory";
import { regFn } from "./fnsdb";
import { W7, W8 } from "./utils";
import { DeltaImpl } from "@/classes/DeltaImpl";

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
      return [IxMod.w7(p_gas)];
    },
  },
});

/**
 * `ΩY` in the graypaper
 * fetch
 */
export const omega_y = regFn<
  [
    workPackage: WorkPackageWithAuth, // p
    n: Hash,
    bold_r: any,
    i: any,
    overline_i: ExportSegment[][], // overline_i
    overline_x: any,
    bold_o: any,
    bold_t: DeferredTransfersImpl,
  ],
  W7 | PVMSingleModMemory | PVMExitPanicMod
>({
  fn: {
    opCode: 1 as u8,
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
  [Xs: ServiceAccountImpl, s: ServiceIndex, delta: DeltaImpl],
  PVMExitPanicMod | W7 | PVMSingleModMemory
>({
  fn: {
    opCode: 2 as u8,
    identifier: "lookup",
    gasCost: 10n as Gas,
    execute(
      context,
      bold_s: ServiceAccountImpl,
      s: ServiceIndex,
      d: DeltaImpl,
    ) {
      let a: ServiceAccountImpl | undefined;
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
      if (typeof a === "undefined" || !a.preimages.has(hash)) {
        // we can't either read memory or `a` cannot be set or the preimage has not the hash we're looking for
        return [IxMod.w7(HostCallResult.NONE)];
      }

      const v = a.preimages.get(hash)!;

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
        IxMod.memory(o, v.subarray(Number(f), Number(f + l))),
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
    opCode: 3 as u8,
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
      const k = context.memory.getBytes(toSafeMemoryAddress(ko), Number(kz));

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
  [bold_s: ServiceAccountImpl, s: ServiceIndex],
  PVMExitPanicMod | W7 | PVMSingleModObject<{ bold_s: ServiceAccountImpl }>
>({
  fn: {
    opCode: 4 as u8,
    identifier: "write",
    gasCost: 10n as Gas,
    execute(context, bold_s: ServiceAccountImpl, s: ServiceIndex) {
      const [k0, kz, v0, vz] = context.registers.slice(7);
      let k: Uint8Array;
      if (!context.memory.canRead(toSafeMemoryAddress(k0), Number(kz))) {
        return [IxMod.panic()];
      } else {
        k = context.memory.getBytes(toSafeMemoryAddress(k0), Number(kz));
      }

      const a = new ServiceAccountImpl({
        ...bold_s,
        storage: bold_s.storage.clone(),
      });

      if (vz === 0n) {
        console.log(
          "\x1b[36m deleting key",
          Uint8ArrayJSONCodec.toJSON(k),
          "\x1b[0m",
          s,
        );
        a.storage.delete(k);
      } else if (context.memory.canRead(toSafeMemoryAddress(v0), Number(vz))) {
        // second bracket
        console.log(
          "\x1b[36m writing key",
          Uint8ArrayJSONCodec.toJSON(k),
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
        const at = bold_s.gasThreshold();
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
  Omit<ServiceAccount, "itemInStorage" | "totalOctets" | "gasThreshold"> & {
    gasThreshold: Gas;
    totalOctets: u64;
    itemInStorage: u32;
  }
>([
  ["codeHash", CodeHashCodec], // c
  ["balance", E_sub<Balance>(8)], // b
  ["gasThreshold", E_sub<Gas>(8)], // t - virutal element
  ["minAccGas", E_sub<Gas>(8)], // g
  ["minMemoGas", E_sub<Gas>(8)], // m
  ["totalOctets", E_sub<u64>(8)], // o - virtual element
  ["itemInStorage", E_sub_int<u32>(4)], // i - virtual element
  ["gratis", E_sub<Balance>(8)], // f
  ["created", E_sub_int<Tau>(4)], // r
  ["lastAcc", E_sub_int<Tau>(4)], // a
  ["parent", E_sub_int<ServiceIndex>(4)], // p
]);

/**
 * `ΩI`
 */
export const omega_i = regFn<
  [s: ServiceIndex, d: DeltaImpl],
  W7 | PVMSingleModMemory | PVMExitPanicMod
>({
  fn: {
    opCode: 4 as u8,
    identifier: "info",
    gasCost: 10n as Gas,
    execute(context, s: ServiceIndex, d: DeltaImpl) {
      const w7 = context.registers[7];
      let bold_a: ServiceAccountImpl | undefined;
      if (w7 === 2n ** 64n - 1n) {
        bold_a = d.get(s);
      } else {
        bold_a = d.get(Number(w7) as ServiceIndex);
      }
      if (typeof bold_a === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }
      const v = encodeWithCodec(serviceAccountCodec, {
        ...bold_a,
        gasThreshold: bold_a.gasThreshold(),
        totalOctets: bold_a.totalOctets(),
        itemInStorage: bold_a.itemInStorage(),
      });

      let f = Number(context.registers[11]);
      if (f > v.length) {
        f = v.length;
      }

      let l = Number(context.registers[12]);
      if (l > v.length - f) {
        l = v.length - f;
      }

      const o = context.registers[8];
      if (!context.memory.canWrite(toSafeMemoryAddress(o), l)) {
        return [IxMod.panic()];
      } else {
        return [IxMod.w7(v.length), IxMod.memory(o, v.subarray(f, f + l))];
      }
    },
  },
});
