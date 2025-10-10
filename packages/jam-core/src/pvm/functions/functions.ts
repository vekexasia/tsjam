import { IdentityMap } from "@/data-structures/identity-map";
import { DeferredTransferImpl } from "@/impls/deferred-transfer-impl";
import { DeltaImpl } from "@/impls/delta-impl";
import {
  computeRequestKey,
  computeStorageKey,
  MerkleServiceAccountStorageImpl,
} from "@/impls/merkle-account-data-storage-impl";
import { PrivilegedServicesImpl } from "@/impls/privileged-services-impl";
import { AccumulationInputInpl } from "@/impls/pvm/accumulation-input-impl";
import { PVMAccumulationStateImpl } from "@/impls/pvm/pvm-accumulation-state-impl";
import { PVMResultContextImpl } from "@/impls/pvm/pvm-result-context-impl";
import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { SlotImpl, TauImpl } from "@/impls/slot-impl";
import { ValidatorsImpl } from "@/impls/validators-impl";
import { WorkContextImpl } from "@/impls/work-context-impl";
import { WorkItemImpl } from "@/impls/work-item-impl";
import { type WorkPackageImpl } from "@/impls/work-package-impl";
import { log } from "@/utils";
import {
  asCodec,
  BufferJSONCodec,
  cloneCodecable,
  createArrayLengthDiscriminator,
  createCodec,
  E_8,
  E_sub,
  E_sub_int,
  encodeWithCodec,
  LengthDiscrimantedIdentityCodec,
  Uint8ArrayJSONCodec,
  xBytesCodec,
} from "@tsjam/codec";
import {
  AUTHPOOL_SIZE,
  AUTHQUEUE_MAX_SIZE,
  BLOCK_TIME,
  CORES,
  EPOCH_LENGTH,
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  ERASURECODE_SEGMENT_SIZE,
  HostCallResult,
  InnerPVMResultCode,
  LOTTERY_MAX_SLOT,
  MAX_EXPORTED_ITEMS,
  MAX_GAS_ACCUMULATION,
  MAX_GAS_IS_AUTHORIZED,
  MAX_SIZE_ENCODED_PACKAGE,
  MAX_TICKETS_PER_BLOCK,
  MAX_TICKETS_PER_VALIDATOR,
  MAX_TOT_SIZE_BLOBS_WORKREPORT,
  MAX_WORK_PREREQUISITES,
  MAX_WORKPACKAGE_ENTRIES,
  MAXIMUM_AGE_LOOKUP_ANCHOR,
  MAXIMUM_EXTRINSICS_IN_WP,
  MAXIMUM_SIZE_IS_AUTHORIZED,
  MAXIMUM_WORK_ITEMS,
  MINIMUM_PUBLIC_SERVICE_INDEX,
  NUMBER_OF_VALIDATORS,
  PREIMAGE_EXPIRATION,
  RECENT_HISTORY_LENGTH,
  SERVICE_ADDITIONAL_BALANCE_PER_ITEM,
  SERVICE_ADDITIONAL_BALANCE_PER_OCTET,
  SERVICE_MIN_BALANCE,
  SERVICECODE_MAX_SIZE,
  TOTAL_GAS_ACCUMULATION_ALL_CORES,
  TOTAL_GAS_REFINEMENT_LOGIC,
  TRANSFER_MEMO_SIZE,
  VALIDATOR_CORE_ROTATION,
  WORK_TIMEOUT,
  Zp,
} from "@tsjam/constants";
import { Hashing } from "@tsjam/crypto";
import {
  BaseMemory,
  check_fn,
  deblobProgram,
  type PVM,
  PVMExitReasonImpl,
  PVMProgramCodec,
  PVMRegistersImpl,
} from "@tsjam/pvm-base";
import { IxMod } from "@tsjam/pvm-js";
import {
  AuthorizerHash,
  Balance,
  Blake2bHash,
  ByteArrayOfLength,
  CodeHash,
  CoreIndex,
  ExportSegment,
  Gas,
  Hash,
  IrregularPVMExitReason,
  PVMExitReasonMod,
  PVMMemoryAccessKind,
  PVMProgram,
  PVMProgramCode,
  PVMSingleModMemory,
  PVMSingleModObject,
  RegularPVMExitReason,
  SeqOfLength,
  ServiceIndex,
  Tagged,
  Tau,
  u32,
  u64,
  UpToSeq,
} from "@tsjam/types";
import { toTagged, zeroPad } from "@tsjam/utils";
import assert from "assert";
import { ConditionalExcept } from "type-fest";
import { pvmImpl } from "../proxy";
import { HostFn } from "./fnsdb";
import { W7, W8, XMod, YMod } from "./utils";
import { HashCodec } from "@/codecs/misc-codecs";
import { MerkleState } from "@/merklization/merkle-state";

export class HostFunctions {
  @HostFn(0)
  // @eslint-disable-next-line @typescript-eslint/no-unused-vars
  gas(pvm: PVM, _: undefined): Array<W7> {
    const p_gas = pvm.gas - 10n;
    return [IxMod.w7(p_gas)];
  }

  @HostFn(1)
  fetch(
    pvm: PVM,
    args: {
      p?: WorkPackageImpl;
      n?: Hash;
      bold_r?: Buffer;
      i?: number; // workPackage.work item index
      overline_i?: ExportSegment[][];
      overline_x?: Buffer[][];
      bold_o?: AccumulationInputInpl[];
    },
  ): Array<W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModMemory> {
    const [w7, w8, w9, w10, w11, w12] = pvm.registers.slice(7);
    const o = w7;
    let v: Buffer | undefined;
    log(
      `HostFunction::fetch w10:${w10.value}`,
      process.env.DEBUG_STEPS === "true",
    );
    switch (w10.value) {
      case 0n: {
        v = Buffer.concat([
          encodeWithCodec(E_8, SERVICE_ADDITIONAL_BALANCE_PER_ITEM), // Bi
          encodeWithCodec(E_8, SERVICE_ADDITIONAL_BALANCE_PER_OCTET), // BL
          encodeWithCodec(E_8, SERVICE_MIN_BALANCE), // BS
          encodeWithCodec(E_sub_int(2), CORES), // C
          encodeWithCodec(E_sub_int(4), PREIMAGE_EXPIRATION), // D
          encodeWithCodec(E_sub_int(4), EPOCH_LENGTH), // E
          // 34
          encodeWithCodec(E_8, MAX_GAS_ACCUMULATION), // GA
          encodeWithCodec(E_8, MAX_GAS_IS_AUTHORIZED), // GI
          encodeWithCodec(E_8, TOTAL_GAS_REFINEMENT_LOGIC), // GR
          encodeWithCodec(E_8, TOTAL_GAS_ACCUMULATION_ALL_CORES), // GT
          encodeWithCodec(E_sub_int(2), RECENT_HISTORY_LENGTH), // H
          encodeWithCodec(E_sub_int(2), MAXIMUM_WORK_ITEMS), // I
          // 70
          encodeWithCodec(E_sub_int(2), MAX_WORK_PREREQUISITES), // J
          encodeWithCodec(E_sub_int(2), MAX_TICKETS_PER_BLOCK), // K
          encodeWithCodec(E_sub_int(4), MAXIMUM_AGE_LOOKUP_ANCHOR), // L
          encodeWithCodec(E_sub_int(2), MAX_TICKETS_PER_VALIDATOR), // N
          // 80
          encodeWithCodec(E_sub_int(2), AUTHPOOL_SIZE), // O
          encodeWithCodec(E_sub_int(2), BLOCK_TIME), // P
          encodeWithCodec(E_sub_int(2), AUTHQUEUE_MAX_SIZE), // Q
          encodeWithCodec(E_sub_int(2), VALIDATOR_CORE_ROTATION), // R
          encodeWithCodec(E_sub_int(2), MAXIMUM_EXTRINSICS_IN_WP), // T
          // 90
          encodeWithCodec(E_sub_int(2), WORK_TIMEOUT), // U
          encodeWithCodec(E_sub_int(2), NUMBER_OF_VALIDATORS), // V
          encodeWithCodec(E_sub_int(4), MAXIMUM_SIZE_IS_AUTHORIZED), // WA
          // 98
          encodeWithCodec(E_sub_int(4), MAX_SIZE_ENCODED_PACKAGE), // WB
          encodeWithCodec(E_sub_int(4), SERVICECODE_MAX_SIZE), // WC
          encodeWithCodec(E_sub_int(4), ERASURECODE_BASIC_SIZE), // WE
          encodeWithCodec(E_sub_int(4), MAX_WORKPACKAGE_ENTRIES), // WM
          encodeWithCodec(E_sub_int(4), ERASURECODE_EXPORTED_SIZE), // WP
          encodeWithCodec(E_sub_int(4), MAX_TOT_SIZE_BLOBS_WORKREPORT), // WR
          encodeWithCodec(E_sub_int(4), TRANSFER_MEMO_SIZE), // WM
          encodeWithCodec(E_sub_int(4), MAX_EXPORTED_ITEMS), // WX
          encodeWithCodec(E_sub_int(4), LOTTERY_MAX_SLOT), // Y
        ]);
        break;
      }
      case 1n: {
        v = args.n;
        break;
      }
      case 2n: {
        v = args.bold_r;
        break;
      }
      case 3n: {
        if (
          typeof args.overline_x !== "undefined" &&
          w11.value < args.overline_x.length &&
          w12.value < args.overline_x[Number(w11)].length
        ) {
          v = args.overline_x[Number(w11)][Number(w12)];
        }
        break;
      }
      case 4n: {
        if (
          typeof args.overline_x !== "undefined" &&
          typeof args.i !== "undefined" &&
          w11.value < (args.overline_x[args.i]?.length ?? 0)
        ) {
          v = args.overline_x[args.i]![Number(w11)];
        }
        break;
      }
      case 5n: {
        if (
          typeof args.overline_i !== "undefined" &&
          w11.value < args.overline_i.length &&
          w12.value < args.overline_i[Number(w11)].length
        ) {
          v = args.overline_i[Number(w11)][Number(w12)];
        }
        break;
      }
      case 6n: {
        if (
          typeof args.overline_i !== "undefined" &&
          typeof args.i !== "undefined" &&
          w11.value < (args.overline_i[args.i]?.length ?? 0)
        ) {
          v = args.overline_i[args.i][Number(w11)];
        }
        break;
      }
      case 7n: {
        v = args.p?.toBinary();
        break;
      }
      case 8n: {
        if (typeof args.p !== "undefined") {
          v = Buffer.concat([
            args.p.authCodeHash,
            encodeWithCodec(LengthDiscrimantedIdentityCodec, args.p.authConfig),
          ]);
        }
        break;
      }
      case 9n: {
        v = args.p?.authToken;
        break;
      }
      case 10n: {
        if (typeof args.p !== "undefined") {
          v = encodeWithCodec(WorkContextImpl, args.p.context);
        }
        break;
      }
      case 11n: {
        if (typeof args.p !== "undefined") {
          v = encodeWithCodec(
            createArrayLengthDiscriminator(SCodec),
            args.p.workItems.map((w) => {
              return {
                ...w,
                iLength: w.importSegments.length,
                xLength: w.exportedDataSegments.length,
                yLength: w.payload.length,
              };
            }),
          );
        }
        break;
      }
      case 12n: {
        if (
          typeof args.p !== "undefined" &&
          w11.value < args.p.workItems.length
        ) {
          const w = args.p.workItems[Number(w11)];
          v = encodeWithCodec(SCodec, {
            ...w,
            iLength: w.importSegments.length,
            xLength: w.exportedDataSegments.length,
            yLength: w.payload.length,
          });
        }
        break;
      }
      case 13n: {
        if (
          typeof args.p !== "undefined" &&
          w11.value < args.p.workItems.length
        ) {
          const w = args.p.workItems[Number(w11)];
          v = w.payload;
        }
        break;
      }
      case 14n: {
        if (typeof args.bold_o !== "undefined") {
          v = encodeWithCodec(
            createArrayLengthDiscriminator(AccumulationInputInpl),
            args.bold_o,
          );
        }
        break;
      }
      case 15n: {
        if (
          typeof args.bold_o !== "undefined" &&
          w11.value < args.bold_o.length
        ) {
          v = encodeWithCodec(AccumulationInputInpl, args.bold_o[Number(w11)]);
        }
        break;
      }
    }

    if (typeof v === "undefined") {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const f = w8.value < v.length ? Number(w8.value) : v.length;
    const l = w9.value < v.length - f ? Number(w9.value) : v.length - f;
    if (!o.fitsInU32() || !pvm.memory.canWrite(o.u32(), l)) {
      return [IxMod.panic()];
    }

    log(
      `Writing at ${o.u32()}|0x${o.u32().toString(16)} ${v.subarray(f, f + l).toString("hex")}`,
      process.env.DEBUG_STEPS === "true",
    );
    return [
      IxMod.w7(BigInt(v.length)),
      IxMod.memory(o.u32(), v.subarray(f, f + l)),
    ];
  }

  /**
   * Basically regturns a slice of preimage blob in either passed
   * bold_s or bold_d[w7]
   */
  @HostFn(2)
  lookup(
    pvm: PVM,
    args: { bold_s: ServiceAccountImpl; s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModMemory> {
    let bold_a: ServiceAccountImpl | undefined;
    const w7 = pvm.registers.w7();
    if (Number(w7) === args.s || w7.value === 2n ** 64n - 1n) {
      bold_a = args.bold_s;
    } else if (w7.fitsInU32() && args.bold_d.has(w7.u32())) {
      bold_a = args.bold_d.get(w7.u32());
    }
    // else bold_a is undefined
    const [h, o] = pvm.registers.slice(8);

    let hash: Blake2bHash;
    if (h.fitsInU32() && pvm.memory.canRead(h.u32(), 32)) {
      hash = <Blake2bHash>Buffer.allocUnsafe(32);
      pvm.memory.readInto(h.u32(), hash);
    } else {
      // v = ∇
      return [IxMod.panic()];
    }

    if (typeof bold_a === "undefined" || !bold_a.preimages.has(hash)) {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const bold_v = bold_a.preimages.get(hash)!;

    const w10 = pvm.registers.w10();
    const w11 = pvm.registers.w11();

    const vLength = BigInt(bold_v.length);
    // start
    const f = w10.value < vLength ? w10.value : vLength;
    // length
    const l = w11.value < vLength - f ? w11.value : vLength - f;

    if (!o.fitsInU32() || !pvm.memory.canWrite(o.u32(), Number(l))) {
      return [IxMod.panic()];
    }
    return [
      IxMod.w7(BigInt(bold_v.length)),
      IxMod.memory(o.u32(), bold_v.subarray(Number(f), Number(f + l))),
    ];
  }

  /**
   * returns a slice of storage of bold_d[w7] or bold_s
   * with key being in memory in [w8:w9]
   * and stores it in memory at w10
   *
   * start and length are determined by w11 and w12
   */
  @HostFn(3)
  read(
    pvm: PVM,
    args: { bold_s: ServiceAccountImpl; s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<PVMExitReasonMod<PVMExitReasonImpl> | W7 | PVMSingleModMemory> {
    const w7 = pvm.registers.w7();
    let bold_a: ServiceAccountImpl | undefined;
    let s_star = <ServiceIndex>Number(w7);
    if (w7.value === 2n ** 64n - 1n) {
      s_star = args.s;
    }
    if (s_star === args.s) {
      bold_a = args.bold_s;
    } else if (args.bold_d.has(s_star)) {
      bold_a = args.bold_d.get(s_star);
    }

    const [ko, kz, o, w11, w12] = pvm.registers.slice(8);
    if (
      !ko.fitsInU32() ||
      !kz.fitsInU32() ||
      !pvm.memory.canRead(ko.u32(), kz.u32())
    ) {
      return [IxMod.panic()];
    }
    const bold_k = Buffer.allocUnsafe(kz.u32());
    pvm.memory.readInto(ko.u32(), bold_k);

    const bold_v = bold_a?.storage.get(bold_k);
    if (typeof bold_v === "undefined") {
      // either bold_a is undefined or no key in storage
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const f = w11.value < bold_v.length ? Number(w11) : bold_v.length;
    const l = w12.value < bold_v.length - f ? Number(w12) : bold_v.length - f;
    if (!o.fitsInU32() || !pvm.memory.canWrite(o.u32(), l)) {
      return [IxMod.panic()];
    }
    return [
      IxMod.w7(BigInt(bold_v.length)),
      IxMod.memory(o.u32(), bold_v.subarray(f, f + l)),
    ];
  }

  /**
   * Computes a new version of given bold_s
   * with either a deleted key in storage [w7;w8] or set coming from memory [w9;w10]
   *
   */
  @HostFn(4)
  write(
    context: PVM,
    args: { bold_s: ServiceAccountImpl; s: ServiceIndex },
  ): Array<
    | PVMExitReasonMod<PVMExitReasonImpl>
    | W7
    | PVMSingleModObject<{ bold_s: ServiceAccountImpl }>
  > {
    const [ko, kz, vo, vz] = context.registers.slice(7);
    let bold_k: Buffer;
    if (
      !ko.fitsInU32() ||
      !kz.fitsInU32() ||
      !context.memory.canRead(ko.u32(), kz.u32())
    ) {
      return [IxMod.panic()];
    } else {
      bold_k = Buffer.allocUnsafe(kz.u32());
      context.memory.readInto(ko.u32(), bold_k);
    }

    const bold_a = args.bold_s.clone();

    if (vz.value === 0n) {
      log(
        `HostFunction::write delete key ${Uint8ArrayJSONCodec.toJSON(bold_k)} for service ${args.s} - ${Uint8ArrayJSONCodec.toJSON(computeStorageKey(args.s, bold_k))}`,
        process.env.DEBUG_STEPS === "true",
      );
      bold_a.storage.delete(bold_k);
    } else if (
      vo.fitsInU32() &&
      vz.fitsInU32() &&
      context.memory.canRead(vo.u32(), vz.u32())
    ) {
      const newData = Buffer.allocUnsafe(vz.u32());
      context.memory.readInto(vo.u32(), newData);
      log(
        `HostFunction::write set key ${Uint8ArrayJSONCodec.toJSON(bold_k)} for service ${args.s} to ${Uint8ArrayJSONCodec.toJSON(newData)} - stateKey=${Uint8ArrayJSONCodec.toJSON(computeStorageKey(args.s, bold_k))}`,
        process.env.DEBUG_STEPS === "true",
      );
      bold_a.storage.set(bold_k, newData);
    } else {
      return [IxMod.panic()];
    }

    if (bold_a.gasThreshold() > bold_a.balance) {
      return [IxMod.w7(HostCallResult.FULL)];
    }
    let l: bigint;
    if (args.bold_s.storage.has(bold_k)) {
      l = BigInt(args.bold_s.storage.get(bold_k)!.length);
    } else {
      l = HostCallResult.NONE;
    }
    return [IxMod.w7(l), IxMod.obj({ bold_s: bold_a })];
  }

  @HostFn(5)
  info(
    pvm: PVM,
    args: { s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<PVMExitReasonMod<PVMExitReasonImpl> | W7 | PVMSingleModMemory> {
    const w7 = pvm.registers.w7();
    let bold_a: ServiceAccountImpl | undefined;
    if (w7.value === 2n ** 64n - 1n) {
      bold_a = args.bold_d.get(args.s);
    } else {
      bold_a = args.bold_d.get(Number(w7) as ServiceIndex);
    }
    if (typeof bold_a === "undefined") {
      return [IxMod.w7(HostCallResult.NONE)];
    }
    const v = encodeWithCodec(serviceAccountCodec, {
      version: 0,
      codeHash: bold_a.codeHash,
      balance: bold_a.balance,
      gasThreshold: bold_a.gasThreshold(),
      minAccGas: bold_a.minAccGas,
      minMemoGas: bold_a.minMemoGas,
      totalOctets: bold_a.totalOctets(),
      itemInStorage: bold_a.itemInStorage(),
      gratis: bold_a.gratis,
      created: bold_a.created,
      lastAcc: bold_a.lastAcc,
      parent: bold_a.parent,
    });

    // NOTE: https://github.com/gavofyork/graypaper/pull/480
    // that is why we have w9 and w10 instead of w11 and w12
    const f = Math.min(Number(pvm.registers.w9().value), v.length);
    const l = Math.min(Number(pvm.registers.w10().value), v.length - f);

    const o = pvm.registers.w8();
    if (!o.fitsInU32() || !pvm.memory.canWrite(o.u32(), l)) {
      return [IxMod.panic()];
    } else {
      return [
        IxMod.w7(BigInt(v.length)),
        IxMod.memory(o.u32(), v.subarray(f, f + l)),
      ];
    }
  }

  /**
   * calls historicalLookup on either given bold_d[s] or bold_d[w7]
   * for tau and Hash in memory at h
   * stores it in memory at o
   */
  @HostFn(6)
  historical_lookup(
    pvm: PVM,
    args: { s: ServiceIndex; bold_d: DeltaImpl; tau: TauImpl },
  ): Array<W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModMemory> {
    const [w7, h, o, w10, w11] = pvm.registers.slice(7);
    if (!h.fitsInU32() || !pvm.memory.canRead(h.u32(), 32)) {
      return [IxMod.panic()];
    }
    let bold_a: ServiceAccountImpl;
    if (w7.value === 2n ** 64n - 1n && args.bold_d.has(args.s)) {
      bold_a = args.bold_d.get(args.s)!;
    } else if (args.bold_d.has(Number(w7) as ServiceIndex)) {
      bold_a = args.bold_d.get(Number(w7) as ServiceIndex)!;
    } else {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const hash: Hash = <Hash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(h.u32(), hash);

    const v = bold_a.historicalLookup(toTagged(args.tau), hash);

    if (typeof v === "undefined") {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const f = Math.min(Number(w10.value), v.length);
    const l = Math.min(Number(w11.value), v.length - f);
    if (!o.fitsInU32() || !pvm.memory.canWrite(o.u32(), l)) {
      return [IxMod.panic()];
    }

    return [
      IxMod.w7(BigInt(v.length)),
      IxMod.memory(o.u32(), v.subarray(f, l)),
    ];
  }

  /**
   * `ΩE` in the graypaper
   * export segment host call
   */
  @HostFn(7)
  export(
    pvm: PVM,
    args: {
      refineCtx: RefineContext;
      /**
       * ς
       */
      segmentOffset: number;
    },
  ): Array<
    W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModObject<RefineContext>
  > {
    const [p, w8] = pvm.registers.slice(7);
    const z = Math.min(Number(w8), ERASURECODE_SEGMENT_SIZE);

    if (!p.fitsInU32() || !pvm.memory.canRead(p.u32(), z)) {
      return [IxMod.panic()];
    }
    if (
      args.segmentOffset + args.refineCtx.segments.length >=
      MAX_EXPORTED_ITEMS
    ) {
      return [IxMod.w7(HostCallResult.FULL)];
    }

    const _bold_x = Buffer.allocUnsafe(z);
    pvm.memory.readInto(p.u32(), _bold_x);

    const bold_x = zeroPad(ERASURECODE_SEGMENT_SIZE, _bold_x);
    const newRefineCtx: RefineContext = {
      segments: args.refineCtx.segments.slice(),
      bold_m: args.refineCtx.bold_m,
    };
    newRefineCtx.segments.push(bold_x);

    return [
      IxMod.w7(BigInt(args.segmentOffset + args.refineCtx.segments.length)),
      IxMod.obj(newRefineCtx),
    ];
  }

  @HostFn(8)
  machine(
    pvm: PVM,
    refineCtx: RefineContext,
  ): Array<
    W7 | PVMSingleModObject<RefineContext> | PVMExitReasonMod<PVMExitReasonImpl>
  > {
    const [po, pz, i] = pvm.registers.slice(7);
    if (
      !po.fitsInU32() ||
      !pz.fitsInU32() ||
      !pvm.memory.canRead(po.u32(), pz.u32())
    ) {
      return [IxMod.panic()];
    }
    const bold_p = Buffer.allocUnsafe(pz.u32());
    pvm.memory.readInto(po.u32(), bold_p);
    try {
      PVMProgramCodec.decode(bold_p);
      // eslint-disable-next-line
    } catch (_e) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const sortedKeys = [...refineCtx.bold_m.keys()].sort((a, b) => a - b);
    let n = 0;
    while (sortedKeys.length > 0 && n == sortedKeys[0]) {
      sortedKeys.shift()!;
      n++;
    }

    // dump
    const bold_u = {
      pages: new Map(),
      heap: { start: <u32>0, end: <u32>0, pointer: <u32>0 },
    };
    const newContext: RefineContext = {
      bold_m: new Map(refineCtx.bold_m),
      segments: refineCtx.segments,
    };
    newContext.bold_m.set(n, {
      code: <PVMProgramCode>bold_p,
      ram: pvmImpl.buildMemory(bold_u),
      instructionPointer: <u32>Number(i.value),
    });
    return [
      IxMod.w7(BigInt(n)), // new Service index?
      IxMod.obj(newContext),
    ];
  }

  /**
   * peek data from refinecontext to memory
   */
  @HostFn(9)
  peek(
    pvm: PVM,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModMemory | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [n, o, s, z] = pvm.registers.slice(7);
    if (
      !o.fitsInU32() ||
      !z.fitsInU32() ||
      !pvm.memory.canWrite(o.u32(), z.u32())
    ) {
      return [IxMod.panic()];
    }

    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const ram = refineCtx.bold_m.get(Number(n))!.ram;
    if (!s.fitsInU32() || !ram.canRead(s.u32(), z.u32())) {
      return [IxMod.w7(HostCallResult.OOB)];
    }

    const newMem = Buffer.allocUnsafe(z.u32());
    ram.readInto(s.u32(), newMem);

    return [IxMod.w7(HostCallResult.OK), IxMod.memory(o.u32(), newMem)];
  }

  /**
   * places stuff from ram to refineContext memory
   * basically the inverse of peek
   */
  @HostFn(10)
  poke(
    pvm: PVM,
    refineCtx: RefineContext,
  ): Array<
    W7 | PVMSingleModObject<RefineContext> | PVMExitReasonMod<PVMExitReasonImpl>
  > {
    const [n, s, o, z] = pvm.registers.slice(7);
    if (
      !s.fitsInU32() ||
      !z.fitsInU32() ||
      !pvm.memory.canRead(s.u32(), z.u32())
    ) {
      return [IxMod.panic()];
    }

    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    if (
      !o.fitsInU32() ||
      !refineCtx.bold_m.get(Number(n))!.ram.canWrite(o.u32(), Number(z))
    ) {
      return [IxMod.w7(HostCallResult.OOB)];
    }

    const newContext: RefineContext = {
      bold_m: new Map(refineCtx.bold_m),
      segments: refineCtx.segments,
    };
    const curN = newContext.bold_m.get(Number(n.value))!;
    const newRam = curN.ram.clone();
    newContext.bold_m.set(Number(n.value), {
      code: curN.code,
      instructionPointer: curN.instructionPointer,
      ram: newRam,
    });

    const data = Buffer.allocUnsafe(z.u32());
    pvm.memory.readInto(s.u32(), data);
    // checked above
    (<Tagged<BaseMemory, "canWrite">>(<unknown>newRam)).writeAt(o.u32(), data);

    return [IxMod.w7(HostCallResult.OK), IxMod.obj(newContext)];
  }

  /**
   * changes refineContext.bold_m[w7].ram
   * - if w10 is <3 sets pages value from w8 to w8 + w9 to 0
   * - if w10 is 0 then remove reading acl
   * - if w10 is 1 or 3 then make the pages readable
   * - if w10 is 2 or 4 then make the pages writable
   */
  @HostFn(11)
  pages(
    pvm: PVM,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModObject<RefineContext>> {
    const [n, p, c, r] = pvm.registers.slice(7);
    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const p_u = refineCtx.bold_m.get(Number(n))!.ram.clone();
    if (r.value > 4 || p.value < 16 || p.value + c.value >= 2 ** 32 / Zp) {
      return [IxMod.w7(HostCallResult.HUH)];
    }
    if (r.value > 2 && p.fitsInU32() && p_u.canRead(p.u32(), Number(c))) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    // for each page from p to c
    for (let i = 0; i < c.value; i++) {
      if (r.value == 1n || r.value == 3n) {
        p_u.upsertACL(Number(p) + i, PVMMemoryAccessKind.Read);
      } else if (r.value == 2n || r.value == 4n) {
        p_u.upsertACL(Number(p) + i, PVMMemoryAccessKind.Write);
      } else if (r.value == 0n) {
        p_u.upsertACL(Number(p) + i, PVMMemoryAccessKind.Null);
      }
      if (r.value < 3) {
        (p_u as Tagged<BaseMemory, "canWrite">).writeAt(
          <u32>((Number(p) + i) * Zp),
          Buffer.alloc(Zp),
        ); // fill with zeros
      }
    }
    const newRefineCtx: RefineContext = {
      bold_m: new Map(refineCtx.bold_m),
      segments: refineCtx.segments,
    };
    const curN = refineCtx.bold_m.get(Number(n.value))!;
    newRefineCtx.bold_m.set(Number(n.value), {
      code: curN.code,
      instructionPointer: curN.instructionPointer,
      ram: p_u,
    });

    return [IxMod.w7(HostCallResult.OK), IxMod.obj(newRefineCtx)];
  }

  @HostFn(12)
  invoke(
    pvm: PVM,
    refineCtx: RefineContext,
  ): Array<
    | W7
    | W8
    | PVMSingleModMemory
    | PVMSingleModObject<RefineContext>
    | PVMExitReasonMod<PVMExitReasonImpl>
  > {
    const [n, o] = pvm.registers.slice(7);
    if (!o.fitsInU32() || !pvm.memory.canWrite(o.u32(), 112)) {
      return [IxMod.panic()];
    }
    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const buf = Buffer.allocUnsafe(112);
    pvm.memory.readInto(o.u32(), buf);
    const g = buf.readBigInt64LE(); // E_8

    const bold_w = PVMRegistersImpl.decode(buf.subarray(8)).value;

    let pc = refineCtx.bold_m.get(Number(n))!.instructionPointer;
    const mem = refineCtx.bold_m.get(Number(n))!.ram;
    let gas = g as Gas;
    let registers = bold_w;

    // NOTE:this should have been handled by the basic invocation but
    // we optimized it out so we need to do it here
    const p = deblobProgram(refineCtx.bold_m.get(Number(n))!.code);
    let exitReason: PVMExitReasonImpl;
    if (p instanceof PVMExitReasonImpl) {
      exitReason = p;
    } else {
      const newPVM = pvmImpl.buildPVM({
        mem,
        regs: bold_w,
        gas,
        pc,
        program: <PVMProgram>p,
      });
      // basic invocation
      exitReason = newPVM.run();

      pc = newPVM.pc;
      gas = newPVM.gas;
      registers = newPVM.registers;
    }

    // compute u*
    const u_star = <PVMSingleModMemory["data"]>{
      from: o.u32(),
      data: Buffer.alloc(112),
    };
    E_8.encode(gas, u_star.data.subarray(0, 8));
    PVMRegistersImpl.encode(registers, u_star.data.subarray(8));

    // compute m*
    const mStar = new Map(refineCtx.bold_m);
    const pvmGuest = new PVMGuest({
      code: mStar.get(Number(n)!)!.code,
      // updated later if hostCAll
      instructionPointer: pc,
      ram: mem,
    });
    mStar.set(Number(n), pvmGuest);

    switch (exitReason.reason) {
      case IrregularPVMExitReason.HostCall: {
        mStar.get(Number(n))!.instructionPointer = toTagged(pc + 1);
        return [
          IxMod.w8(exitReason.opCode!),
          IxMod.w7(InnerPVMResultCode.HOST),
          IxMod.memory(u_star.from, u_star.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case IrregularPVMExitReason.PageFault: {
        return [
          IxMod.w7(InnerPVMResultCode.FAULT),
          IxMod.w8(exitReason.address!), // address
          IxMod.memory(u_star.from, u_star.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case RegularPVMExitReason.OutOfGas: {
        return [
          IxMod.w7(InnerPVMResultCode.OOG),
          IxMod.memory(u_star.from, u_star.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case RegularPVMExitReason.Panic: {
        return [
          IxMod.w7(InnerPVMResultCode.PANIC),
          IxMod.memory(u_star.from, u_star.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case RegularPVMExitReason.Halt: {
        return [
          IxMod.w7(InnerPVMResultCode.HALT),
          IxMod.memory(u_star.from, u_star.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
    }
  }

  /**
   * Remove a machine from refineContext.bold_m
   */
  @HostFn(13)
  expunge(
    pvm: PVM,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModObject<RefineContext>> {
    const [n] = pvm.registers.slice(7);
    if (!refineCtx.bold_m.has(Number(n.value))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const newRefineCtx: RefineContext = {
      bold_m: new Map(refineCtx.bold_m),
      segments: refineCtx.segments,
    };
    newRefineCtx.bold_m.delete(Number(n));
    return [
      IxMod.w7(refineCtx.bold_m.get(Number(n))!.instructionPointer),
      IxMod.obj(newRefineCtx),
    ];
  }

  /**
   * `ΩB`
   * bless service host call
   */
  @HostFn(14)
  bless(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [m, a, v, r, o, n] = pvm.registers.slice(7);
    if (!a.fitsInU32() || !pvm.memory.canRead(a.u32(), 4 * CORES)) {
      return [IxMod.panic()];
    }

    const assignBuf = Buffer.allocUnsafe(4 * CORES);
    pvm.memory.readInto(a.u32(), assignBuf);
    const bold_a =
      PrivilegedServicesImpl.codecOf("assigners").decode(assignBuf).value;

    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 12 * Number(n.value))) {
      return [IxMod.panic()];
    }

    const bold_z = new Map<ServiceIndex, Gas>();
    const buf = Buffer.allocUnsafe(12 * Number(n.value));
    pvm.memory.readInto(o.u32(), buf);

    for (let i = 0; i < n.value; i++) {
      const data = buf.subarray(i * 12, (i + 1) * 12);
      const key = E_sub_int<ServiceIndex>(4).decode(data).value;
      const value = E_sub<Gas>(8).decode(data.subarray(4)).value;
      bold_z.set(key, value);
    }

    // if (x.id !== x.state.manager) {
    //   return [IxMod.w7(HostCallResult.HUH)];
    // }

    if (!m.fitsInU32() || !v.fitsInU32() || !r.fitsInU32()) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const newX = new PVMResultContextImpl({
      id: x.id,
      nextFreeID: x.nextFreeID,
      provisions: x.provisions,
      transfers: x.transfers,
      yield: x.yield,
      state: new PVMAccumulationStateImpl({
        accounts: x.state.accounts,
        authQueue: x.state.authQueue,
        stagingSet: x.state.stagingSet,
        // modifications start here
        manager: m.u32(),
        assigners: bold_a,
        delegator: v.u32(),
        registrar: r.u32(),
        alwaysAccers: bold_z,
      }),
    });

    return [
      IxMod.w7(HostCallResult.OK),
      IxMod.obj({
        x: newX,
      }),
    ];
  }

  /**
   * `ΩA`
   * assign core host call
   */
  @HostFn(15)
  assign(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [c, o, a] = pvm.registers.slice(7);

    if (
      !o.fitsInU32() ||
      !pvm.memory.canRead(o.u32(), AUTHQUEUE_MAX_SIZE * 32)
    ) {
      return [IxMod.panic()];
    }
    if (c.value >= CORES) {
      return [IxMod.w7(HostCallResult.CORE)];
    }
    if (x.id !== x.state.assigners[Number(c.value)]) {
      return [IxMod.w7(HostCallResult.HUH)];
    }
    if (!a.fitsInU32()) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const data = Buffer.allocUnsafe(AUTHQUEUE_MAX_SIZE * 32);
    pvm.memory.readInto(o.u32(), data);
    const bold_q: SeqOfLength<AuthorizerHash, typeof AUTHQUEUE_MAX_SIZE> =
      toTagged([]);
    for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
      bold_q.push(<AuthorizerHash>data.subarray(i * 32, (i + 1) * 32));
    }
    const newX = new PVMResultContextImpl({
      id: x.id,
      nextFreeID: x.nextFreeID,
      provisions: x.provisions,
      yield: x.yield,
      transfers: x.transfers,
      state: new PVMAccumulationStateImpl({
        authQueue: cloneCodecable(x.state.authQueue),
        assigners: toTagged(x.state.assigners.slice()),

        accounts: x.state.accounts,
        stagingSet: x.state.stagingSet,
        manager: x.state.manager,
        delegator: x.state.delegator,
        registrar: x.state.registrar,
        alwaysAccers: x.state.alwaysAccers,
      }),
    });
    newX.state.authQueue.elements[Number(c.value)] = bold_q;
    newX.state.assigners[Number(c.value)] = <ServiceIndex>a.u32();
    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   * `ΩD`
   * designate validators host call
   */
  @HostFn(16)
  designate(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const o = pvm.registers.w7();
    if (
      !o.fitsInU32() ||
      !pvm.memory.canRead(o.u32(), 336 * NUMBER_OF_VALIDATORS)
    ) {
      return [IxMod.panic()];
    }

    const vData = Buffer.allocUnsafe(336 * NUMBER_OF_VALIDATORS);
    pvm.memory.readInto(o.u32(), vData);
    const bold_v = ValidatorsImpl.decode(vData).value;

    if (x.id !== x.state.delegator) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const newX = new PVMResultContextImpl({
      id: x.id,
      nextFreeID: x.nextFreeID,
      provisions: x.provisions,
      yield: x.yield,
      state: new PVMAccumulationStateImpl({
        stagingSet: toTagged(bold_v),

        accounts: x.state.accounts,
        authQueue: x.state.authQueue,
        assigners: x.state.assigners,
        manager: x.state.manager,
        delegator: x.state.delegator,
        registrar: x.state.registrar,
        alwaysAccers: x.state.alwaysAccers,
      }),
      transfers: x.transfers,
    });
    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   *
   * `ΩC`
   * checkpoint host call
   */
  @HostFn(17)
  checkpoint(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | YMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    // deep clone x
    const p_y = x.clone();
    const gasAfter = pvm.gas - 10n; // gas cost of checkpoint = 10
    return [IxMod.w7(gasAfter), IxMod.obj({ y: p_y })];
  }

  /**
   * `ΩN`
   * new-service host call
   */
  @HostFn(18)
  new(
    pvm: PVM,
    args: { x: PVMResultContextImpl; tau: TauImpl },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, l, g, m, f, i] = pvm.registers.slice(7);

    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32) || !l.fitsInU32()) {
      return [IxMod.panic()];
    }
    const codeHash = <CodeHash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(o.u32(), codeHash);
    if (f.value !== 0n && args.x.id !== args.x.state.manager) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    //log(`nextFreeId: ${args.x.nextFreeID}`, process.env.DEBUG_STEPS === "true");
    const i_star = check_fn(
      <ServiceIndex>(
        (MINIMUM_PUBLIC_SERVICE_INDEX +
          ((args.x.nextFreeID - MINIMUM_PUBLIC_SERVICE_INDEX + 42) %
            (2 ** 32 - MINIMUM_PUBLIC_SERVICE_INDEX - 2 ** 8)))
      ),
      args.x.state.accounts,
    );
    //const i_star = check_fn(
    //  <ServiceIndex>(
    //    (2 ** 8 + ((args.x.nextFreeID - 2 ** 8 + 42) % (2 ** 32 - 2 ** 9)))
    //  ),
    //  args.x.state.accounts,
    //);
    //log(`i*: ${i_star}`, process.env.DEBUG_STEPS === "true");

    const storage = new MerkleServiceAccountStorageImpl(args.x.nextFreeID);
    const bold_a = new ServiceAccountImpl(
      {
        version: 0,
        codeHash,
        balance: <Balance>0n, // set later to a_t
        minAccGas: g.value as u64 as Gas,
        minMemoGas: m.value as u64 as Gas,
        preimages: new IdentityMap(),
        created: args.tau,
        gratis: f.value as u64 as Balance,
        lastAcc: new SlotImpl(<u32>0),
        parent: args.x.id,
      },
      storage,
    );
    bold_a.requests.set(
      codeHash,
      l.u32(),
      [] as unknown as UpToSeq<TauImpl, 3>,
    );
    bold_a.balance = <Balance>(<u64>bold_a.gasThreshold());

    const x_bold_s = args.x.bold_s();

    const bold_s = x_bold_s.clone();
    bold_s.balance = <Balance>(x_bold_s.balance - bold_a.gasThreshold());

    if (bold_s.balance < x_bold_s.gasThreshold()) {
      return [IxMod.w7(HostCallResult.CASH)];
    }
    if (
      args.x.id === args.x.state.registrar &&
      i.value < MINIMUM_PUBLIC_SERVICE_INDEX &&
      args.x.state.accounts.has(<ServiceIndex>Number(i.value))
    ) {
      return [IxMod.w7(HostCallResult.FULL)];
    }
    const newX = new PVMResultContextImpl({
      id: args.x.id,
      nextFreeID: args.x.nextFreeID,
      provisions: args.x.provisions,
      yield: args.x.yield,
      state: new PVMAccumulationStateImpl({
        accounts: new DeltaImpl(args.x.state.accounts.elements),
        authQueue: args.x.state.authQueue,
        stagingSet: args.x.state.stagingSet,
        assigners: args.x.state.assigners,
        manager: args.x.state.manager,
        delegator: args.x.state.delegator,
        registrar: args.x.state.registrar,
        alwaysAccers: args.x.state.alwaysAccers,
      }),
      transfers: args.x.transfers,
    });

    if (
      args.x.id == args.x.state.registrar &&
      i.fitsInU32() &&
      i.value < MINIMUM_PUBLIC_SERVICE_INDEX
    ) {
      newX.state.accounts.set(i.u32(), bold_a);
      newX.state.accounts.set(args.x.id, bold_s);

      return [IxMod.w7(i.u32())];
    }

    // otherwise i*
    newX.nextFreeID = i_star;
    newX.state.accounts.set(args.x.nextFreeID, bold_a);
    newX.state.accounts.set(args.x.id, bold_s);
    return [
      IxMod.w7(args.x.nextFreeID),
      IxMod.obj({
        x: newX,
      }),
    ];
  }

  /**
   * `ΩU`
   * upgrade-service host call
   */
  @HostFn(19)
  upgrade(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, g, m] = pvm.registers.slice(7);
    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32)) {
      return [IxMod.panic()];
    } else {
      const x_bold_s_prime = x.bold_s().clone();
      const codeHash = <CodeHash>Buffer.allocUnsafe(32);
      pvm.memory.readInto(o.u32(), codeHash);

      x_bold_s_prime.codeHash = codeHash;
      x_bold_s_prime.minAccGas = g.u64();
      x_bold_s_prime.minMemoGas = m.u64();

      // NOTE: this is necessary as x.bold_s() is basically a lookup on state accounts
      const newX = x.clone();
      newX.state.accounts.set(newX.id, x_bold_s_prime);
      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.obj({
          x: newX,
        }),
      ];
    }
  }

  /**
   * `ΩT`
   * transfer host call
   * NOTE: gas is dynamic
   */
  @HostFn(20, (pvm) => <Gas>(pvm.registers.w9().value + 10n))
  transfer(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [d, a, l, o] = pvm.registers.slice(7);

    const bold_d = x.state.accounts.clone();

    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), TRANSFER_MEMO_SIZE)) {
      return [IxMod.panic()];
    }

    if (!d.fitsInU32() || !bold_d.has(d.u32())) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    if (l.value < bold_d.get(d.u32())!.minMemoGas) {
      return [IxMod.w7(HostCallResult.LOW)];
    }

    // NOTE: this is b (look at 0.6.6) seems an error in later versions of the graypaper
    const b = <Balance>(x.bold_s().balance - a.value);
    if (b < x.bold_s().gasThreshold()) {
      return [IxMod.w7(HostCallResult.CASH)];
    }

    const memoBuf = <ByteArrayOfLength<typeof TRANSFER_MEMO_SIZE>>(
      Buffer.allocUnsafe(TRANSFER_MEMO_SIZE)
    );
    pvm.memory.readInto(o.u32(), memoBuf);
    const t: DeferredTransferImpl = new DeferredTransferImpl({
      source: x.id,
      destination: d.u32(),
      amount: a.u64(),
      gas: l.u64(),
      memo: memoBuf,
    });

    const newX = x.clone();
    newX.transfers.elements.push(t);
    newX.state.accounts.get(x.id)!.balance = b;

    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   * `Ωj`
   */
  @HostFn(21)
  eject(
    pvm: PVM,
    args: { x: PVMResultContextImpl; tau: Tau },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [d, o] = pvm.registers.slice(7);

    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32)) {
      return [IxMod.panic()];
    }
    const h = <Hash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(o.u32(), h);
    if (
      !d.fitsInU32() ||
      (args.x.id != d.u32() && !args.x.state.accounts.has(d.u32()))
    ) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const bold_d = args.x.state.accounts.get(d.u32())!;

    if (
      Buffer.compare(
        bold_d.codeHash,
        encodeWithCodec(E_sub_int(32), args.x.id),
      ) !== 0
    ) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const d_o = bold_d.totalOctets();
    const l = <u32>(Math.max(81, Number(d_o)) - 81);
    const dlhl = bold_d.requests.get(h, l);

    if (bold_d.itemInStorage() !== 2 || typeof dlhl === "undefined") {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const [, y] = dlhl;

    if (dlhl.length === 2 && y.value < args.tau.value - PREIMAGE_EXPIRATION) {
      const newX = args.x.clone();
      const s_prime = newX.bold_s(); // already cloned
      s_prime.balance = toTagged(s_prime.balance + bold_d.balance);

      newX.state.accounts.delete(d.u32());
      // reset bold_s
      newX.state.accounts.set(args.x.id, s_prime);
      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
    }
    return [IxMod.w7(HostCallResult.HUH)];
  }

  /**
   * `ΩQ`
   * query-service host call
   */
  @HostFn(22)
  query(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | W8 | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = pvm.registers.slice(7);

    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32)) {
      return [IxMod.panic()];
    }

    const h = <Hash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(o.u32(), h);
    const x_bold_s = x.bold_s();

    const bold_a = x_bold_s.requests.get(h, Number(z) as u32);
    if (typeof bold_a === "undefined") {
      log(
        `Query[${h.toString("hex")}, ${z}] not there`,
        process.env.DEBUG_STEPS === "true",
      );
      return [IxMod.w7(HostCallResult.NONE), IxMod.w8(0)];
    }
    const [_x, y, _z] = bold_a.map((x) => BigInt(x.value));
    switch (bold_a.length) {
      case 0:
        return [IxMod.w7(0), IxMod.w8(0)];
      case 1:
        return [IxMod.w7(1n + 2n ** 32n * _x), IxMod.w8(0)];
      case 2:
        return [IxMod.w7(2n + 2n ** 32n * _x), IxMod.w8(y)];
      default:
        return [IxMod.w7(3n + 2n ** 32n * _x), IxMod.w8(y + 2n ** 32n * _z)];
    }
  }

  /**
   * `ΩS`
   * solicit-preimage host call
   */
  @HostFn(23)
  solicit(
    pvm: PVM,
    args: { x: PVMResultContextImpl; tau: TauImpl },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = pvm.registers.slice(7);
    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32)) {
      return [IxMod.panic()];
    }
    const h = <Hash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(o.u32(), h);

    const newX = args.x.clone();
    const bold_a = newX.bold_s();

    const _z = <u32>Number(z);
    if (typeof bold_a.requests.get(h, _z) === "undefined") {
      log(
        `Solicit[${h.toString("hex")}, ${_z}] - not found > adding - newStateKey: ${computeRequestKey(newX.id, h, _z).toString("hex")}`,
        process.env.DEBUG_STEPS === "true",
      );
      bold_a.requests.set(h, _z, toTagged([]));
    } else if (bold_a.requests.get(h, _z)?.length === 2) {
      log(
        `Solicit[${h.toString("hex")}, ${_z}] - l:2 > adding ${args.tau}`,
        process.env.DEBUG_STEPS === "true",
      );
      const value = bold_a.requests.get(h, _z)!;
      bold_a.requests.set(h, _z, toTagged([...value, args.tau]));
    } else {
      log(
        `Solicit[${h.toString("hex")}, ${_z}] - HUH`,
        process.env.DEBUG_STEPS === "true",
      );
      return [IxMod.w7(HostCallResult.HUH)];
    }

    if (bold_a.balance < bold_a.gasThreshold()) {
      log(
        `Solicit[${h.toString("hex")}, ${_z}] - FULL`,
        process.env.DEBUG_STEPS === "true",
      );
      return [IxMod.w7(HostCallResult.FULL)];
    }

    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   * `ΩF`
   * forget preimage host call
   *
   */
  @HostFn(24)
  forget(
    pvm: PVM,
    args: { x: PVMResultContextImpl; tau: TauImpl },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = pvm.registers.slice(7);
    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32)) {
      return [IxMod.panic()];
    }
    if (!z.fitsInU32()) {
      // if it does not fit then .requests cant have it for sure
      // so bold_a is unset
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const h = <Hash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(o.u32(), h);

    const newX = args.x.clone();
    const x_bold_s = newX.bold_s();

    const xslhz = x_bold_s.requests.get(h, z.u32());

    if (typeof xslhz === "undefined") {
      return [IxMod.w7(HostCallResult.HUH)];
    } else {
      const [x, y, w] = xslhz;

      log(
        `Preimage Request id=${newX.id} h=${HashCodec.toJSON(h)} | z=${Number(z)} - stateKey=${BufferJSONCodec().toJSON(computeRequestKey(newX.id, h, z.u32()))}`,
        process.env.DEBUG_STEPS === "true",
      );
      log(
        `Preimage key=${MerkleState.preimageKey(newX.id, h).toString("hex")}`,
        process.env.DEBUG_STEPS === "true",
      );
      if (
        xslhz.length === 0 ||
        (xslhz.length === 2 && y.value < args.tau.value - PREIMAGE_EXPIRATION)
      ) {
        log(
          `l=0 or l=2 but expired... Deleting preimage`,
          process.env.DEBUG_STEPS === "true",
        );
        x_bold_s.requests.delete(h, z.u32());
        x_bold_s.preimages.delete(h);
      } else if (xslhz.length === 1) {
        log(
          `l=1... adding tau=${args.tau.value}`,
          process.env.DEBUG_STEPS === "true",
        );
        x_bold_s.requests.set(h, z.u32(), toTagged([x, args.tau]));
      } else if (
        xslhz.length === 3 &&
        y.value < args.tau.value - PREIMAGE_EXPIRATION
      ) {
        log(
          `l=3 but expired... removing oldest tau`,
          process.env.DEBUG_STEPS === "true",
        );
        x_bold_s.requests.set(h, z.u32(), toTagged([w, args.tau]));
      } else {
        return [IxMod.w7(HostCallResult.HUH)];
      }
    }

    //NOTE: shouldnt be necessary here for clarity
    newX.state.accounts.set(newX.id, x_bold_s);

    return [
      IxMod.w7(HostCallResult.OK),
      IxMod.obj({
        x: newX,
      }),
    ];
  }

  /**
   * `ΩΩ`
   */
  @HostFn(25)
  yield(
    pvm: PVM,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const o = pvm.registers.w7();
    if (!o.fitsInU32() || !pvm.memory.canRead(o.u32(), 32)) {
      return [IxMod.panic()];
    }
    const h = <Hash>Buffer.allocUnsafe(32);
    pvm.memory.readInto(o.u32(), h);
    const newX = x.clone();
    newX.yield = h;
    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  @HostFn(26)
  provide(
    pvm: PVM,
    args: { x: PVMResultContextImpl; s: ServiceIndex },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = pvm.registers.slice(8);
    const w7 = pvm.registers.w7();

    let s_star = <ServiceIndex>Number(w7);
    if (w7.value === 2n ** 64n - 1n) {
      s_star = args.s;
    }

    if (
      !o.fitsInU32() ||
      !z.fitsInU32() ||
      !pvm.memory.canRead(o.u32(), z.u32())
    ) {
      return [IxMod.panic()];
    }

    const bold_i = Buffer.allocUnsafe(z.u32());
    pvm.memory.readInto(o.u32(), bold_i);

    const bold_d = args.x.state.accounts;
    const bold_a = bold_d.get(s_star);

    if (typeof bold_a === "undefined") {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    if (bold_a.requests.get(Hashing.blake2b(bold_i), z.u32())?.length !== 0) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    if (
      args.x.provisions.find(
        (x) => x.serviceId === s_star && Buffer.compare(x.blob, bold_i) === 0,
      )
    ) {
      // already there
      return [IxMod.w7(HostCallResult.HUH)];
    }
    const newX = args.x.clone();
    newX.provisions.push({
      serviceId: s_star,
      blob: bold_i,
    });

    return [
      IxMod.w7(HostCallResult.OK),
      IxMod.obj({
        x: newX,
      }),
    ];
  }

  @HostFn(100, <Gas>0n)
  log(
    pvm: PVM,
    deps: {
      core: CoreIndex;
      serviceIndex?: ServiceIndex;
    },
  ): Array<never> {
    const [w7, _w8, _w9, _w10, _w11] = pvm.registers.slice(7);
    assert(w7.fitsInU32());
    assert(_w9.fitsInU32());
    assert(_w11.fitsInU32());
    assert(_w8.fitsInU32());
    assert(_w10.fitsInU32());

    const level = w7.u32();
    const w8 = _w8.u32();
    const w9 = _w9.u32();
    let target: Buffer | undefined;
    if (w8 !== 0 && w9 !== 0) {
      target = Buffer.allocUnsafe(w9);
      (<Tagged<BaseMemory, "canRead">>pvm.memory).readInto(w8, target);
    }

    const w10 = _w10.u32();
    const w11 = _w11.u32();

    const msgBuf = Buffer.allocUnsafe(w11);

    (<Tagged<BaseMemory, "canRead">>pvm.memory).readInto(w10, msgBuf);

    const lvlString = ["FATAL", "WARN", "INFO", "DEBUG", "TRACE"][level];
    // const lvlIdentifier = ["⛔️", "⚠️", "ℹ️", "💁", "🪡"][level];
    let formattedMessage = `${new Date().toISOString()} ${lvlString}@${deps.core}`;
    if (typeof deps.serviceIndex !== "undefined") {
      formattedMessage += `#${deps.serviceIndex}`;
    }

    if (typeof target !== "undefined") {
      formattedMessage += ` ${Buffer.from(target).toString("utf8")}`;
    }

    formattedMessage += ` ${Buffer.from(msgBuf).toString("utf8")}`;

    log(formattedMessage, true);
    return [];
  }
}

export const hostFunctions = new HostFunctions();
/**
 * used in fetch
 */
const SCodec = createCodec<
  ConditionalExcept<WorkItemImpl, Function> & {
    iLength: number;
    xLength: number;
    yLength: number;
  }
>([
  ["service", WorkItemImpl.codecOf("service")],
  ["codeHash", WorkItemImpl.codecOf("codeHash")],
  ["refineGasLimit", WorkItemImpl.codecOf("refineGasLimit")],
  ["accumulateGasLimit", WorkItemImpl.codecOf("accumulateGasLimit")],
  ["exportCount", WorkItemImpl.codecOf("exportCount")],
  ["iLength", E_sub_int(2)],
  ["xLength", E_sub_int(2)],
  ["yLength", E_sub_int(4)],
]);

const serviceAccountCodec = createCodec<
  ConditionalExcept<
    Omit<
      ServiceAccountImpl,
      | "preimages"
      | "requests"
      | "storage"
      | "itemInStorage"
      | "totalOctets"
      | "gasThreshold"
      | "merkleStorage"
    >,
    Function
  > & {
    gasThreshold: Gas;
    totalOctets: u64;
    itemInStorage: u32;
  }
>([
  ["codeHash", xBytesCodec<CodeHash, 32>(32)], // c
  ["balance", E_sub<Balance>(8)], // b
  ["gasThreshold", E_sub<Gas>(8)], // t - virutal element
  ["minAccGas", E_sub<Gas>(8)], // g
  ["minMemoGas", E_sub<Gas>(8)], // m
  ["totalOctets", E_sub<u64>(8)], // o - virtual element
  ["itemInStorage", E_sub_int<u32>(4)], // i - virtual element
  ["gratis", E_sub<Balance>(8)], // f
  ["created", asCodec(SlotImpl)], // r
  ["lastAcc", asCodec(SlotImpl)], // a
  ["parent", E_sub_int<ServiceIndex>(4)], // p
]);

/**
 * $(0.7.1 - B.4)
 */
export class PVMGuest {
  /**
   * `p`
   */
  code!: PVMProgramCode;
  /**
   * `u`
   */
  ram!: BaseMemory;
  /**
   * `i`
   * or `pc` in latex
   */
  instructionPointer!: u32;
  constructor(config: ConditionalExcept<PVMGuest, Function>) {
    Object.assign(this, config);
  }
}

/**
 * Defined in section B.6
 */
export type RefineContext = {
  bold_m: Map<number, PVMGuest>;
  /**
   * `e`
   */
  segments: ByteArrayOfLength<typeof ERASURECODE_SEGMENT_SIZE>[];
};
