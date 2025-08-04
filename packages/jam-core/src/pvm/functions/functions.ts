import { DeferredTransferImpl } from "@/classes/DeferredTransferImpl";
import { DeltaImpl } from "@/classes/DeltaImpl";
import { MerkleServiceAccountStorageImpl } from "@/classes/MerkleServiceAccountStorageImpl";
import { PrivilegedServicesImpl } from "@/classes/PrivilegedServicesImpl";
import { PVMAccumulationOpImpl } from "@/classes/pvm/PVMAccumulationOPImpl";
import { PVMExitReasonImpl } from "@/classes/pvm/PVMExitReasonImpl";
import { PVMProgramExecutionContextImpl } from "@/classes/pvm/PVMProgramExecutionContextImpl";
import { PVMRegistersImpl } from "@/classes/pvm/PVMRegistersImpl";
import { PVMResultContextImpl } from "@/classes/pvm/PVMResultContextImpl";
import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import { ValidatorsImpl } from "@/classes/ValidatorsImpl";
import { WorkItemImpl } from "@/classes/WorkItemImpl";
import { WorkPackageImpl } from "@/classes/WorkPackageImpl";
import {
  Blake2bHashCodec,
  CodeHashCodec,
  createArrayLengthDiscriminator,
  createCodec,
  E_8,
  E_sub,
  E_sub_int,
  encodeWithCodec,
  HashCodec,
  Uint8ArrayJSONCodec,
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
  AuthorizerHash,
  Balance,
  Blake2bHash,
  ByteArrayOfLength,
  CodeHash,
  ExportSegment,
  Gas,
  Hash,
  IrregularPVMExitReason,
  PVMExitReasonMod,
  PVMMemoryAccessKind,
  PVMSingleModMemory,
  PVMSingleModObject,
  RegularPVMExitReason,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  u32,
  u64,
  UpToSeq,
} from "@tsjam/types";
import { toTagged, zeroPad } from "@tsjam/utils";
import { ConditionalExcept } from "type-fest";
import { IxMod } from "../instructions/utils";
import { basicInvocation } from "../invocations/basic";
import { PVMMemory } from "../pvmMemory";
import { check_fn } from "../utils/check_fn";
import { HostFn } from "./fnsdb";
import { W7, W8, XMod, YMod } from "./utils";

export class HostFunctions {
  @HostFn(0)
  gas(context: PVMProgramExecutionContextImpl, _: undefined): Array<W7> {
    const p_gas = context.gas - 10n;
    return [IxMod.w7(p_gas)];
  }

  @HostFn(1)
  fetch(
    context: PVMProgramExecutionContextImpl,
    args: {
      p: WorkPackageImpl;
      n?: Hash; // TODO: discover what this is
      bold_r?: Uint8Array;
      i?: number; // workPackage.work item index
      overline_i?: ExportSegment[][];
      overline_x?: Uint8Array[][];
      bold_i?: PVMAccumulationOpImpl[];
    },
  ): Array<W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModMemory> {
    const [w7, w8, w9, w10, w11, w12] = context.registers.slice(7);
    const o = w7;
    let v: Uint8Array | undefined;
    switch (w10.value) {
      case 0n: {
        v = new Uint8Array([
          ...encodeWithCodec(E_8, SERVICE_ADDITIONAL_BALANCE_PER_ITEM), // Bi
          ...encodeWithCodec(E_8, SERVICE_ADDITIONAL_BALANCE_PER_OCTET), // BL
          ...encodeWithCodec(E_8, SERVICE_MIN_BALANCE), // BS
          ...encodeWithCodec(E_sub_int(2), CORES), // C
          ...encodeWithCodec(E_sub_int(4), PREIMAGE_EXPIRATION), // D
          ...encodeWithCodec(E_sub_int(4), EPOCH_LENGTH), // E
          ...encodeWithCodec(E_8, MAX_GAS_ACCUMULATION), // GA
          ...encodeWithCodec(E_8, MAX_GAS_IS_AUTHORIZED), // GI
          ...encodeWithCodec(E_8, TOTAL_GAS_REFINEMENT_LOGIC), // GR
          ...encodeWithCodec(E_8, TOTAL_GAS_ACCUMULATION_ALL_CORES), // GT
          ...encodeWithCodec(E_sub_int(2), RECENT_HISTORY_LENGTH), // H
          ...encodeWithCodec(E_sub_int(2), MAXIMUM_WORK_ITEMS), // I
          ...encodeWithCodec(E_sub_int(2), MAX_WORK_PREREQUISITES), // J
          ...encodeWithCodec(E_sub_int(2), MAX_TICKETS_PER_BLOCK), // K
          ...encodeWithCodec(E_sub_int(4), MAXIMUM_AGE_LOOKUP_ANCHOR), // L
          ...encodeWithCodec(E_sub_int(2), MAX_TICKETS_PER_VALIDATOR), // N
          ...encodeWithCodec(E_sub_int(2), AUTHPOOL_SIZE), // O
          ...encodeWithCodec(E_sub_int(2), BLOCK_TIME), // P
          ...encodeWithCodec(E_sub_int(2), AUTHQUEUE_MAX_SIZE), // Q
          ...encodeWithCodec(E_sub_int(2), VALIDATOR_CORE_ROTATION), // R
          ...encodeWithCodec(E_sub_int(2), MAXIMUM_EXTRINSICS_IN_WP), // T
          ...encodeWithCodec(E_sub_int(2), WORK_TIMEOUT), // U
          ...encodeWithCodec(E_sub_int(2), NUMBER_OF_VALIDATORS), // V
          ...encodeWithCodec(E_sub_int(4), MAXIMUM_SIZE_IS_AUTHORIZED), // WA
          ...encodeWithCodec(E_sub_int(4), MAX_SIZE_ENCODED_PACKAGE), // WB
          ...encodeWithCodec(E_sub_int(4), SERVICECODE_MAX_SIZE), // WC
          ...encodeWithCodec(E_sub_int(4), ERASURECODE_BASIC_SIZE), // WE
          ...encodeWithCodec(E_sub_int(4), MAX_WORKPACKAGE_ENTRIES), // WM
          ...encodeWithCodec(E_sub_int(4), ERASURECODE_EXPORTED_SIZE), // WP
          ...encodeWithCodec(E_sub_int(4), MAX_TOT_SIZE_BLOBS_WORKREPORT), // WR
          ...encodeWithCodec(E_sub_int(4), TRANSFER_MEMO_SIZE), // WM
          ...encodeWithCodec(E_sub_int(4), MAX_EXPORTED_ITEMS), // WX
          ...encodeWithCodec(E_sub_int(4), LOTTERY_MAX_SLOT), // Y
        ]);
        break;
      }
      case 1n: {
        if (typeof args.n !== "undefined") {
          v = encodeWithCodec(HashCodec, args.n);
        }
        break;
      }
      case 2n: {
        if (typeof args.bold_r !== "undefined") {
          v = args.bold_r;
        }
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
        if (typeof args.p !== "undefined") {
          v = args.p.toBinary();
        }
        break;
      }
      case 8n: {
        if (typeof args.p !== "undefined") {
          v = new Uint8Array([
            ...encodeWithCodec(
              WorkPackageImpl.codecOf("authCodeHash"),
              args.p.authCodeHash,
            ),
            ...encodeWithCodec(
              WorkPackageImpl.codecOf("authConfig"),
              args.p.authConfig,
            ),
          ]);
        }
        break;
      }
      case 9n: {
        if (typeof args.p !== "undefined") {
          v = args.p.authToken;
        }
        break;
      }
      case 10n: {
        if (typeof args.p !== "undefined") {
          v = encodeWithCodec(
            WorkPackageImpl.codecOf("context"),
            args.p.context,
          );
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
        if (typeof args.bold_i !== "undefined") {
          v = encodeWithCodec(
            createArrayLengthDiscriminator(PVMAccumulationOpImpl),
            args.bold_i,
          );
        }
        break;
      }
      case 15n: {
        if (
          typeof args.bold_i !== "undefined" &&
          w11.value < args.bold_i.length
        ) {
          v = args.bold_i[Number(w11)].toBinary();
        }
        break;
      }
    }

    if (typeof v === "undefined") {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const f = w8.value < v.length ? Number(w8.value) : v.length;
    const l = w9.value < v.length - f ? Number(w9.value) : v.length - f;
    if (!context.memory.canWrite(o.value, l)) {
      return [IxMod.panic()];
    }

    return [IxMod.w7(v.length), IxMod.memory(o.value, v.subarray(f, f + l))];
  }

  /**
   * Basically regturns a slice of preimage blob in either passed
   * bold_s or bold_d[w7]
   */
  @HostFn(2)
  lookup(
    context: PVMProgramExecutionContextImpl,
    args: { bold_s: ServiceAccountImpl; s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModMemory> {
    let bold_a: ServiceAccountImpl | undefined;
    const w7 = context.registers.w7();
    if (Number(w7) === args.s || w7.value === 2n ** 64n - 1n) {
      bold_a = args.bold_s;
    } else if (w7.fitsInU32() && args.bold_d.has(w7.checked_u32())) {
      bold_a = args.bold_d.get(w7.checked_u32());
    }
    // else bold_a is undefined
    const [h, o] = context.registers.slice(8);

    let hash: Blake2bHash;
    if (context.memory.canRead(h.value, 32)) {
      hash = Blake2bHashCodec.decode(
        context.memory.getBytes(h.value, 32),
      ).value;
    } else {
      // v = ∇
      return [IxMod.panic()];
    }

    if (!context.memory.canWrite(o.value, 32)) {
      return [IxMod.panic()];
    }

    if (typeof bold_a === "undefined" || !bold_a.preimages.has(hash)) {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const bold_v = bold_a.preimages.get(hash)!;

    const w10 = context.registers.w10();
    const w11 = context.registers.w11();

    const vLength = BigInt(bold_v.length);
    // start
    const f = w10.value < vLength ? w10.value : vLength;
    // length
    const l = w11.value < vLength - f ? w11.value : vLength - f;

    return [
      IxMod.w7(bold_v.length),
      IxMod.memory(o.value, bold_v.subarray(Number(f), Number(f + l))),
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
    context: PVMProgramExecutionContextImpl,
    args: { bold_s: ServiceAccountImpl; s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<PVMExitReasonMod<PVMExitReasonImpl> | W7 | PVMSingleModMemory> {
    const w7 = context.registers.w7();
    let bold_a: ServiceAccountImpl | undefined = args.bold_s;
    let s_star = args.s;
    if (w7.value !== 2n ** 64n - 1n) {
      if (w7.fitsInU32() && args.bold_d.has(w7.checked_u32())) {
        bold_a = args.bold_d.get(w7.checked_u32());
      }
      s_star = <ServiceIndex>Number(w7);
    }

    const [ko, kz, o, w11, w12] = context.registers.slice(8);
    if (!context.memory.canRead(ko.toSafeMemoryAddress(), Number(kz))) {
      return [IxMod.panic()];
    }
    const bold_k = context.memory.getBytes(
      ko.toSafeMemoryAddress(),
      Number(kz),
    );

    const bold_v = bold_a?.storage.get(bold_k);
    if (typeof bold_v === "undefined") {
      // either a is undefined or no key in storage
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const f = w11.value < bold_v.length ? Number(w11) : bold_v.length;
    const l = w12.value < bold_v.length - f ? Number(w12) : bold_v.length - f;
    if (!o.fitsInU32() || !context.memory.canWrite(o.checked_u32(), l)) {
      return [IxMod.panic()];
    }
    return [
      IxMod.w7(bold_v.length),
      IxMod.memory(o.checked_u32(), bold_v.subarray(f, f + l)),
    ];
  }

  /**
   * Computes a new version of given bold_s
   * with either a deleted key in storage [w7;w8] or set coming from memory [w9;w10]
   *
   */
  @HostFn(4)
  write(
    context: PVMProgramExecutionContextImpl,
    args: { bold_s: ServiceAccountImpl; s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<
    | PVMExitReasonMod<PVMExitReasonImpl>
    | W7
    | PVMSingleModObject<{ bold_s: ServiceAccountImpl }>
  > {
    const [ko, kz, vo, vz] = context.registers.slice(7);
    let bold_k: Uint8Array;
    if (
      !ko.fitsInU32() ||
      !kz.fitsInU32() ||
      !context.memory.canRead(ko.checked_u32(), kz.checked_u32())
    ) {
      return [IxMod.panic()];
    } else {
      bold_k = context.memory.getBytes(ko.checked_u32(), kz.checked_u32());
    }

    const bold_a = structuredClone(args.bold_s);

    if (vz.value === 0n) {
      console.log(
        "\x1b[36m deleting key",
        Uint8ArrayJSONCodec.toJSON(bold_k),
        "\x1b[0m",
        args.s,
      );
      bold_a.storage.delete(bold_k);
    } else if (
      vo.fitsInU32() &&
      vz.fitsInU32() &&
      context.memory.canRead(vo.checked_u32(), vz.checked_u32())
    ) {
      // second bracket
      console.log(
        "\x1b[36m writing key",
        Uint8ArrayJSONCodec.toJSON(bold_k),
        "\x1b[0m",
        args.s,
        Uint8ArrayJSONCodec.toJSON(
          context.memory.getBytes(vo.checked_u32(), vz.checked_u32()),
        ),
        context.gas,
      );
      bold_a.storage.set(
        bold_k,
        context.memory.getBytes(vo.checked_u32(), vz.checked_u32()),
      );
    } else {
      return [IxMod.panic()];
    }

    if (bold_a.gasThreshold() > bold_a.balance) {
      return [IxMod.w7(HostCallResult.FULL)];
    }
    let l: number | bigint;
    if (args.bold_s.storage.has(bold_k)) {
      l = args.bold_s.storage.get(bold_k)!.length;
    } else {
      l = HostCallResult.NONE;
    }
    return [IxMod.w7(l), IxMod.obj({ bold_s: bold_a })];
  }

  @HostFn(5)
  info(
    context: PVMProgramExecutionContextImpl,
    args: { s: ServiceIndex; bold_d: DeltaImpl },
  ): Array<PVMExitReasonMod<PVMExitReasonImpl> | W7 | PVMSingleModMemory> {
    const w7 = context.registers.w7();
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
      ...(<ServiceAccount>bold_a),
      gasThreshold: bold_a.gasThreshold(),
      totalOctets: bold_a.totalOctets(),
      itemInStorage: bold_a.itemInStorage(),
    });

    let f = Number(context.registers.w11());
    if (f > v.length) {
      f = v.length;
    }

    let l = Number(context.registers.w12());
    if (l > v.length - f) {
      l = v.length - f;
    }

    const o = context.registers.w8();
    if (!o.fitsInU32() || !context.memory.canWrite(o.checked_u32(), l)) {
      return [IxMod.panic()];
    } else {
      return [
        IxMod.w7(v.length),
        IxMod.memory(o.checked_u32(), v.subarray(f, f + l)),
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
    context: PVMProgramExecutionContextImpl,
    args: { s: ServiceIndex; bold_d: DeltaImpl; tau: Tau },
  ): Array<W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModMemory> {
    const [w7, h, o, w10, w11] = context.registers.slice(7);
    if (!h.fitsInU32() || !context.memory.canRead(h.checked_u32(), 32)) {
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

    const v = bold_a.historicalLookup(
      toTagged(args.tau),
      HashCodec.decode(context.memory.getBytes(h.checked_u32(), 32)).value,
    );

    if (typeof v === "undefined") {
      return [IxMod.w7(HostCallResult.NONE)];
    }

    const f = Math.min(Number(w10), v.length);
    const l = Math.min(Number(w11), v.length - f);
    if (!o.fitsInU32() || !context.memory.canWrite(o.checked_u32(), l)) {
      return [IxMod.panic()];
    }

    return [
      IxMod.w7(v.length),
      IxMod.memory(o.checked_u32(), v.subarray(f, l)),
    ];
  }

  /**
   * `ΩE` in the graypaper
   * export segment host call
   */
  @HostFn(7)
  export(
    context: PVMProgramExecutionContextImpl,
    args: { refineCtx: RefineContext; segmentOffset: number },
  ): Array<
    W7 | PVMExitReasonMod<PVMExitReasonImpl> | PVMSingleModObject<RefineContext>
  > {
    const [p, w8] = context.registers.slice(7);
    const z = Math.min(Number(w8), ERASURECODE_SEGMENT_SIZE);

    if (!p.fitsInU32() || !context.memory.canRead(p.checked_u32(), z)) {
      return [IxMod.panic()];
    }
    if (
      args.segmentOffset + args.refineCtx.segments.length >=
      MAX_EXPORTED_ITEMS
    ) {
      return [IxMod.w7(HostCallResult.FULL)];
    }
    const bold_x = zeroPad(
      ERASURECODE_SEGMENT_SIZE,
      context.memory.getBytes(p.checked_u32(), z),
    );
    const newRefineCtx = structuredClone(args.refineCtx);
    newRefineCtx.segments.push(bold_x);

    return [
      IxMod.w7(args.segmentOffset + args.refineCtx.segments.length),
      IxMod.obj(newRefineCtx),
    ];
  }

  @HostFn(8)
  machine(
    context: PVMProgramExecutionContextImpl,
    refineCtx: RefineContext,
  ): Array<
    W7 | PVMSingleModObject<RefineContext> | PVMExitReasonMod<PVMExitReasonImpl>
  > {
    const [po, pz, i] = context.registers.slice(7);
    if (
      !po.fitsInU32() ||
      !pz.fitsInU32() ||
      !context.memory.canRead(po.checked_u32(), pz.checked_u32())
    ) {
      return [IxMod.panic()];
    }
    const bold_p = context.memory.getBytes(po.checked_u32(), pz.checked_u32());

    const sortedKeys = [...refineCtx.bold_m.keys()].sort((a, b) => a - b);
    let n = 0;
    while (sortedKeys.length > 0 && n == sortedKeys[0]) {
      sortedKeys.shift()!;
      n++;
    }

    const bold_u = new PVMMemory(new Map(), new Map(), {
      start: <u32>0,
      end: <u32>0,
      pointer: <u32>0,
    });
    const newContext = structuredClone(refineCtx);
    newContext.bold_m.set(n, {
      code: bold_p,
      ram: bold_u,
      instructionPointer: <u32>Number(i.value),
    });
    return [
      IxMod.w7(n), // new Service index?
      IxMod.obj(newContext),
    ];
  }

  /**
   * peek data from refinecontext to memory
   */
  @HostFn(9)
  peek(
    context: PVMProgramExecutionContextImpl,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModMemory | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [n, o, s, z] = context.registers.slice(7);
    if (
      !o.fitsInU32() ||
      !z.fitsInU32() ||
      !context.memory.canWrite(o.checked_u32(), z.checked_u32())
    ) {
      return [IxMod.panic()];
    }

    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    if (
      !s.fitsInU32() ||
      !refineCtx.bold_m
        .get(Number(n))!
        .ram.canRead(s.checked_u32(), z.checked_u32())
    ) {
      return [IxMod.w7(HostCallResult.OOB)];
    }

    return [
      IxMod.w7(HostCallResult.OK),
      IxMod.memory(
        o.checked_u32(),
        refineCtx.bold_m
          .get(Number(n))!
          .ram.getBytes(s.checked_u32(), z.checked_u32()),
      ),
    ];
  }

  @HostFn(10)
  poke(
    context: PVMProgramExecutionContextImpl,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModMemory | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [n, o, s, z] = context.registers.slice(7);
    if (
      !o.fitsInU32() ||
      !z.fitsInU32() ||
      !context.memory.canWrite(o.checked_u32(), z.checked_u32())
    ) {
      return [IxMod.panic()];
    }

    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    if (!refineCtx.bold_m.get(Number(n))!.ram.canRead(s.value, Number(z))) {
      return [IxMod.w7(HostCallResult.OOB)];
    }

    return [
      IxMod.w7(HostCallResult.OK),
      IxMod.memory(
        o.checked_u32(),
        refineCtx.bold_m
          .get(Number(n))!
          .ram.getBytes(s.checked_u32(), Number(z)),
      ),
    ];
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
    context: PVMProgramExecutionContextImpl,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModObject<RefineContext>> {
    const [n, p, c, r] = context.registers.slice(7);
    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const bold_u = refineCtx.bold_m.get(Number(n))!.ram;

    if (r.value > 4 || p.value < 16 || p.value + c.value >= 2 ** 32 / Zp) {
      return [IxMod.w7(HostCallResult.HUH)];
    }
    if (r.value > 2 && bold_u.canRead(p.value, Number(c))) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const p_u = structuredClone(bold_u);

    for (let i = 0; i < c.value; i++) {
      if (r.value < 3) {
        p_u
          .changeAcl(Number(p) + i, PVMMemoryAccessKind.Write)
          .setBytes(<u32>((Number(p) + i) * Zp), new Uint8Array(Zp).fill(0)); // fill with zeros
      }

      if (r.value == 1n || r.value == 3n) {
        p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Read);
      } else if (r.value == 2n || r.value == 4n) {
        p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Write);
      } else if (r.value == 0n) {
        p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Null);
      }
    }
    const newRefineCtx = structuredClone(refineCtx);
    newRefineCtx.bold_m.get(Number(n))!.ram = p_u;

    return [IxMod.w7(HostCallResult.OK), IxMod.obj(newRefineCtx)];
  }

  @HostFn(12)
  invoke(
    context: PVMProgramExecutionContextImpl,
    refineCtx: RefineContext,
  ): Array<
    | W7
    | W8
    | PVMSingleModMemory
    | PVMSingleModObject<RefineContext>
    | PVMExitReasonMod<PVMExitReasonImpl>
  > {
    const [n, o] = context.registers.slice(7);
    if (!context.memory.canWrite(o.value, 112)) {
      return [IxMod.panic()];
    }
    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const g = E_8.decode(context.memory.getBytes(o.value, 8)).value;
    const bold_w = PVMRegistersImpl.decode(
      context.memory.getBytes(o.value + 8n, 112 - 8),
    ).value;

    const pvmCtx = new PVMProgramExecutionContextImpl({
      instructionPointer: refineCtx.bold_m.get(Number(n))!.instructionPointer,
      gas: g as Gas,
      registers: bold_w,
      memory: structuredClone(refineCtx.bold_m.get(Number(n))!.ram),
    });
    const res = basicInvocation(refineCtx.bold_m.get(Number(n))!.code, pvmCtx);

    // compute u*
    const newMemory = <PVMSingleModMemory["data"]>{
      from: o.checked_u32(),
      data: new Uint8Array(112),
    };
    E_8.encode(res.context.gas, newMemory.data.subarray(0, 8));
    PVMRegistersImpl.encode(res.context.registers, newMemory.data.subarray(8));

    // compute m*
    const mStar = structuredClone(refineCtx.bold_m);
    mStar.get(Number(n))!.ram = res.context.memory;
    mStar.get(Number(n))!.instructionPointer = res.context.instructionPointer;
    switch (res.exitReason.reason) {
      case IrregularPVMExitReason.HostCall: {
        mStar.get(Number(n))!.instructionPointer = toTagged(
          res.context.instructionPointer + 1,
        );
        return [
          IxMod.w8(res.exitReason.opCode!),
          IxMod.w7(InnerPVMResultCode.HOST),
          IxMod.memory(newMemory.from, newMemory.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case IrregularPVMExitReason.PageFault: {
        return [
          IxMod.w7(InnerPVMResultCode.FAULT),
          IxMod.w8(res.exitReason.address!), // address
          IxMod.memory(newMemory.from, newMemory.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case RegularPVMExitReason.OutOfGas: {
        return [
          IxMod.w7(InnerPVMResultCode.OOG),
          IxMod.memory(newMemory.from, newMemory.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case RegularPVMExitReason.Panic: {
        return [
          IxMod.w7(InnerPVMResultCode.PANIC),
          IxMod.memory(newMemory.from, newMemory.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
      case RegularPVMExitReason.Halt: {
        return [
          IxMod.w7(InnerPVMResultCode.HALT),
          IxMod.memory(newMemory.from, newMemory.data),
          IxMod.obj({ ...refineCtx, bold_m: mStar }),
        ];
      }
    }
  }

  @HostFn(13)
  expunge(
    context: PVMProgramExecutionContextImpl,
    refineCtx: RefineContext,
  ): Array<W7 | PVMSingleModObject<RefineContext>> {
    const [n] = context.registers.slice(7);
    if (!refineCtx.bold_m.has(Number(n))) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const newRefineCtx = structuredClone(refineCtx);
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
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [m, a, v, r, o, n] = context.registers.slice(7);
    if (!context.memory.canRead(a.toSafeMemoryAddress(), 4 * CORES)) {
      return [IxMod.panic()];
    }

    const bold_a = PrivilegedServicesImpl.codecOf("assigners").decode(
      context.memory.getBytes(a.toSafeMemoryAddress(), 4 * CORES),
    ).value;

    if (!context.memory.canRead(o.toSafeMemoryAddress(), 12 * Number(n))) {
      return [IxMod.panic()];
    }
    const bold_z = new Map<ServiceIndex, Gas>();
    const buf = context.memory.getBytes(
      o.toSafeMemoryAddress(),
      12 * Number(n),
    );
    for (let i = 0; i < n.value; i++) {
      const data = buf.subarray(i * 12, (i + 1) * 12);
      const key = E_sub_int<ServiceIndex>(4).decode(data).value;
      const value = E_sub<Gas>(8).decode(data.subarray(4)).value;
      bold_z.set(key, value);
    }

    if (x.id !== x.state.manager) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    if (m.value >= 2 ** 32 || a.value >= 2 ** 32 || r.value >= 2 ** 32) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const newX = structuredClone(x);
    newX.state.manager = m.checked_u32();
    newX.state.assigners = bold_a;
    newX.state.delegator = v.checked_u32();
    newX.state.alwaysAccers = bold_z;
    newX.state.registrar = r.checked_u32();

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
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [c, o, a] = context.registers.slice(7);

    if (
      !context.memory.canRead(o.toSafeMemoryAddress(), AUTHQUEUE_MAX_SIZE * 32)
    ) {
      return [IxMod.panic()];
    }
    if (c.value >= CORES) {
      return [IxMod.w7(HostCallResult.CORE)];
    }
    if (x.id !== x.state.assigners[Number(c)]) {
      return [IxMod.w7(HostCallResult.HUH)];
    }
    if (a.value >= 2 ** 32) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const bold_q = context.memory.getBytes(
      o.toSafeMemoryAddress(),
      AUTHQUEUE_MAX_SIZE * 32,
    );
    const nl: AuthorizerHash[] = [];
    for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
      nl.push(
        <AuthorizerHash>(
          HashCodec.decode(bold_q.subarray(i * 32, (i + 1) * 32)).value
        ),
      );
    }
    const newX = structuredClone(x);
    newX.state.authQueue.elements[Number(c)] = toTagged(nl);

    newX.state.assigners[Number(c)] = <ServiceIndex>Number(a);
    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   * `ΩD`
   * designate validators host call
   */
  @HostFn(16)
  designate(
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const o = context.registers.w7();
    if (
      !context.memory.canRead(
        o.toSafeMemoryAddress(),
        336 * NUMBER_OF_VALIDATORS,
      )
    ) {
      return [IxMod.panic()];
    }

    const bold_v = ValidatorsImpl.decode(
      context.memory.getBytes(
        o.toSafeMemoryAddress(),
        336 * NUMBER_OF_VALIDATORS,
      ),
    ).value;

    if (x.id !== x.state.delegator) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const newX = structuredClone(x);
    newX.state.stagingSet = toTagged(bold_v);
    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   *
   * `ΩC`
   * checkpoint host call
   */
  @HostFn(17)
  checkpoint(
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | YMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    // deep clone x
    const p_y = structuredClone(x);
    const gasAfter = context.gas - 10n; // gas cost of checkpoint = 10
    return [IxMod.w7(gasAfter), IxMod.obj({ y: p_y })];
  }

  /**
   * `ΩN`
   * new-service host call
   */
  @HostFn(18)
  new(
    context: PVMProgramExecutionContextImpl,
    args: { x: PVMResultContextImpl; tau: Tau },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, l, g, m, f, i] = context.registers.slice(7);

    if (
      !context.memory.canRead(o.toSafeMemoryAddress(), 32) ||
      l.value >= 2 ** 32
    ) {
      return [IxMod.panic()];
    }
    const c = <CodeHash>(
      HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32))
        .value
    );
    if (f.value !== 0n && args.x.id !== args.x.state.manager) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const i_star = check_fn(
      <ServiceIndex>(
        (MINIMUM_PUBLIC_SERVICE_INDEX +
          ((args.x.nextFreeID - MINIMUM_PUBLIC_SERVICE_INDEX + 42) %
            (2 ** 32 - MINIMUM_PUBLIC_SERVICE_INDEX - 2 ** 8)))
      ),
      args.x.state.accounts,
    );

    const storage = new MerkleServiceAccountStorageImpl(args.x.nextFreeID);
    const a = new ServiceAccountImpl({
      codeHash: c,
      requests: new Map(),
      balance: <Balance>0n,
      minAccGas: g.value as u64 as Gas,
      minMemoGas: m.value as u64 as Gas,
      preimages: new Map(),
      created: args.tau,
      gratis: f.value as u64 as Balance,
      lastAcc: <Tau>0,
      parent: args.x.id,
      storage,
    });
    a.requests.set(c, new Map());
    a.requests
      .get(c)!
      .set(<Tagged<u32, "length">>Number(l), [] as unknown as UpToSeq<Tau, 3>);
    a.balance = <Balance>(<u64>a.gasThreshold());

    const x_bold_s = args.x.bold_s();

    const bold_s = new ServiceAccountImpl({
      ...x_bold_s,
      balance: <Balance>(x_bold_s.balance - a.gasThreshold()),
    });

    if (bold_s.balance < x_bold_s.gasThreshold()) {
      return [IxMod.w7(HostCallResult.CASH)];
    }

    if (
      args.x.id === args.x.state.registrar &&
      i.value < MINIMUM_PUBLIC_SERVICE_INDEX &&
      args.x.state.accounts.has(i.checked_u32())
    ) {
      return [IxMod.w7(HostCallResult.FULL)];
    }

    const newX = structuredClone(args.x);
    if (
      args.x.id === args.x.state.registrar &&
      i.value < MINIMUM_PUBLIC_SERVICE_INDEX
    ) {
      newX.state.accounts.set(i.checked_u32(), a);
      newX.state.accounts.set(args.x.id, bold_s);
      return [IxMod.w7(i.value), IxMod.obj({ x: newX })];
    }

    newX.nextFreeID = i_star;
    newX.state.accounts.set(args.x.nextFreeID, a);
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
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, g, m] = context.registers.slice(7);
    if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
      return [IxMod.panic()];
    } else {
      const x_bold_s_prime = structuredClone(x.bold_s());

      x_bold_s_prime.codeHash = <CodeHash>(
        HashCodec.decode(context.memory.getBytes(o.toSafeMemoryAddress(), 32))
          .value
      );
      x_bold_s_prime.minAccGas = g.u64();
      x_bold_s_prime.minMemoGas = m.u64();

      // NOTE: this is necessary as x.bold_s() is basically a lookup on state accounts
      const newX = structuredClone(x);
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
   */
  @HostFn(20)
  transfer(
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [d, a, l, o] = context.registers.slice(7);

    const bold_d = structuredClone(x.state.accounts);

    if (!context.memory.canRead(o.toSafeMemoryAddress(), TRANSFER_MEMO_SIZE)) {
      return [IxMod.panic()];
    }

    if (!d.fitsInU32() || !bold_d.has(d.checked_u32())) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    if (l.value < bold_d.get(d.checked_u32())!.minMemoGas) {
      return [IxMod.w7(HostCallResult.LOW)];
    }
    if (a.value < x.bold_s().gasThreshold()) {
      return [IxMod.w7(HostCallResult.CASH)];
    }
    const b = x.bold_s().balance - a.value;

    const t: DeferredTransferImpl = new DeferredTransferImpl({
      source: x.id,
      destination: d.checked_u32(),
      amount: a.u64(),
      gas: l.u64(),
      memo: toTagged(
        context.memory.getBytes(o.toSafeMemoryAddress(), TRANSFER_MEMO_SIZE),
      ),
    });

    const newX = structuredClone(x);
    newX.transfers.elements.push(t);
    newX.state.accounts.get(x.id)!.balance = <Balance>b;

    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  /**
   * `Ωj`
   */
  @HostFn(21)
  eject(
    context: PVMProgramExecutionContextImpl,
    args: { x: PVMResultContextImpl; tau: Tau },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [d, o] = context.registers.slice(7);

    if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
      return [IxMod.panic()];
    }
    const h = HashCodec.decode(
      context.memory.getBytes(o.toSafeMemoryAddress(), 32),
    ).value;
    if (
      !d.fitsInU32() ||
      args.x.id != d.checked_u32() ||
      !args.x.state.accounts.has(d.checked_u32())
    ) {
      return [IxMod.w7(HostCallResult.WHO)];
    }
    const bold_d = args.x.state.accounts.get(d.checked_u32())!;

    // NOTE: check on codehash is probably wrong :) graypaper states E_32(x.s) but it does not make sense
    if (bold_d.codeHash !== BigInt(args.x.id)) {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    const d_o = bold_d.totalOctets();
    const l = <u32>Number((d_o > 81 ? d_o : 81n) - 81n);
    const dlhl = bold_d.requests.get(h)?.get(toTagged(l));

    if (bold_d.itemInStorage() !== 2 || typeof dlhl === "undefined") {
      return [IxMod.w7(HostCallResult.HUH)];
    }
    const [, y] = dlhl;
    if (dlhl.length === 2 && y < args.tau - PREIMAGE_EXPIRATION) {
      const newX = structuredClone(args.x);
      newX.state.accounts.delete(d.checked_u32());
      const s_prime = newX.state.accounts.get(args.x.id)!;
      s_prime.balance = toTagged(s_prime.balance + bold_d.balance);

      // NOTE: not necessary to re set but here for clarity
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
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | W8 | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = context.registers.slice(7);

    if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
      return [IxMod.panic()];
    }

    const h = HashCodec.decode(
      context.memory.getBytes(o.toSafeMemoryAddress(), 32),
    ).value;
    const x_bold_s = x.bold_s();

    const bold_a = x_bold_s.requests.get(h)?.get(toTagged(Number(z) as u32));
    if (typeof bold_a === "undefined") {
      return [IxMod.w7(HostCallResult.NONE), IxMod.w8(0)];
    }
    const [_x, y, _z] = bold_a.map((x) => BigInt(x));
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
    context: PVMProgramExecutionContextImpl,
    args: { x: PVMResultContextImpl; tau: Tau },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = context.registers.slice(7);
    if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
      return [IxMod.panic()];
    }
    const h: Hash = HashCodec.decode(
      context.memory.getBytes(o.toSafeMemoryAddress(), 32),
    ).value;

    const newX = structuredClone(args.x);
    const bold_a = newX.bold_s();

    const _z = Number(z) as Tagged<u32, "length">;
    if (typeof bold_a.requests.get(h)?.get(_z) === "undefined") {
      bold_a.requests.set(h, new Map([[_z, toTagged([])]]));
    } else if (bold_a.requests.get(h)?.get(_z)?.length === 2) {
      bold_a.requests.get(h)!.get(_z)!.push(args.tau);
    } else {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    if (bold_a.balance < bold_a.gasThreshold()) {
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
    context: PVMProgramExecutionContextImpl,
    args: { x: PVMResultContextImpl; tau: Tau },
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = context.registers.slice(7);
    if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
      return [IxMod.panic()];
    }
    if (!z.fitsInU32()) {
      // if it does not fit then .requests cant have it for sure
      // so bold_a is unset
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const h = HashCodec.decode(
      context.memory.getBytes(o.toSafeMemoryAddress(), 32),
    ).value;

    const newX = structuredClone(args.x);
    const x_bold_s = newX.bold_s();

    if (typeof x_bold_s.requests.get(h) === "undefined") {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    const xslhz = x_bold_s.requests.get(h)?.get(z.checked_u32());

    if (typeof xslhz === "undefined") {
      // means we have `h` but no `z`
      if (x_bold_s.requests.get(h)?.size === 0) {
        x_bold_s.requests.delete(h);
      }
      x_bold_s.preimages.delete(h);
    } else {
      const [x, y, w] = xslhz;
      if (xslhz.length === 2 && y < args.tau - PREIMAGE_EXPIRATION) {
        x_bold_s.requests.get(h)!.delete(z.checked_u32());
        if (x_bold_s.requests.get(h)!.size === 0) {
          x_bold_s.requests.delete(h);
        }
        x_bold_s.preimages.delete(h);
      } else if (xslhz.length === 1) {
        x_bold_s.requests.get(h)!.set(z.checked_u32(), toTagged([x, args.tau]));
      } else if (xslhz.length === 3 && y < args.tau - PREIMAGE_EXPIRATION) {
        x_bold_s.requests.get(h)!.set(z.checked_u32(), toTagged([w, args.tau]));
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
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const o = context.registers.w7();
    if (!context.memory.canRead(o.toSafeMemoryAddress(), 32)) {
      return [IxMod.panic()];
    }
    const h = HashCodec.decode(
      context.memory.getBytes(o.toSafeMemoryAddress(), 32),
    ).value;
    const newX = structuredClone(x);
    newX.yield = h;
    return [IxMod.w7(HostCallResult.OK), IxMod.obj({ x: newX })];
  }

  @HostFn(26)
  provide(
    context: PVMProgramExecutionContextImpl,
    x: PVMResultContextImpl,
  ): Array<W7 | XMod | PVMExitReasonMod<PVMExitReasonImpl>> {
    const [o, z] = context.registers.slice(8);
    const w7 = context.registers.w7();

    let s = <ServiceIndex>Number(w7);
    if (w7.value === 2n ** 64n - 1n) {
      s = x.id;
    }

    if (!context.memory.canRead(o.toSafeMemoryAddress(), Number(z))) {
      return [IxMod.panic()];
    }

    const bold_i = context.memory.getBytes(o.toSafeMemoryAddress(), Number(z));

    const bold_d = x.state.accounts;
    const bold_a = bold_d.get(s);

    if (typeof bold_a === "undefined") {
      return [IxMod.w7(HostCallResult.WHO)];
    }

    if (
      bold_a.requests.get(Hashing.blake2b(bold_i))?.get(z.checked_u32())
        ?.length !== 0
    ) {
      return [IxMod.w7(HostCallResult.HUH)];
    }

    if (
      x.provisions.find(
        (x) => x.serviceId === s && Buffer.compare(x.blob, bold_i) === 0,
      )
    ) {
      // already there
      return [IxMod.w7(HostCallResult.HUH)];
    }
    const newX = structuredClone(x);
    newX.provisions.push({
      serviceId: s,
      blob: bold_i,
    });

    return [
      IxMod.w7(HostCallResult.OK),
      IxMod.obj({
        x: newX,
      }),
    ];
  }

  @HostFn(100, <Gas>10n)
  log(context: PVMProgramExecutionContextImpl, _: undefined): Array<any> {
    console.log("log host call");
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
 * $(0.7.1 - B.4)
 */
export type PVMGuest = {
  /**
   * `p`
   */
  code: Uint8Array;
  /**
   * `u`
   */
  ram: PVMMemory;
  /**
   * `i`
   * or `pc` in latex
   */
  instructionPointer: u32;
};

export type RefineContext = {
  bold_m: Map<number, PVMGuest>;
  /**
   * `e`
   */
  segments: ByteArrayOfLength<typeof ERASURECODE_SEGMENT_SIZE>[];
};
