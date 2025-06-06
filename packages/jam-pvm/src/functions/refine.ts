import { regFn } from "@/functions/fnsdb.js";
import {
  Delta,
  Gas,
  PVMExitPanicMod,
  PVMMemoryAccessKind,
  PVMProgramExecutionContextBase,
  PVMSingleModMemory,
  PVMSingleModObject,
  RegularPVMExitReason,
  ServiceAccount,
  ServiceIndex,
  Tau,
  u32,
  u8,
} from "@tsjam/types";
import { W7, W8 } from "@/functions/utils.js";
import {
  ERASURECODE_SEGMENT_SIZE,
  HostCallResult,
  InnerPVMResultCode,
  MAX_WORKPACKAGE_ENTRIES,
  Zp,
} from "@tsjam/constants";
import { toInBoundsMemoryAddress, toSafeMemoryAddress } from "@/pvmMemory.js";
import { historicalLookup, zeroPad } from "@tsjam/utils";
import { PVMMemory } from "@/pvmMemory.js";
import { E_4, E_8, HashCodec } from "@tsjam/codec";
import { basicInvocation } from "@/invocations/basic.js";
import assert from "node:assert";
import { IxMod } from "@/instructions/utils.js";
import { pbkdf2 } from "node:crypto";
export type RefineContext = {
  m: Map<
    number,
    {
      /**
       * `p`
       */
      programCode: Uint8Array;
      /**
       * `u`
       */
      memory: PVMMemory;
      /**
       * `i`
       */
      instructionPointer: u32;
    }
  >;
  /**
   * segments
   */
  e: Uint8Array[];
};

/**
 * `ΩH` in the graypaper
 * historical lookup preimage
 */
export const omega_h = regFn<
  [s: ServiceIndex, delta: Delta, t: Tau],
  W7 | PVMSingleModMemory | PVMExitPanicMod
>({
  fn: {
    opCode: 6 as u8,
    identifier: "historical_lookup",
    gasCost: 10n as Gas,
    execute(context, s: ServiceIndex, delta: Delta, t: Tau) {
      const [_w7, h, o, w10, w11] = context.registers.slice(7);
      const w7 = Number(_w7);
      if (context.memory.canRead(toSafeMemoryAddress(h), 32)) {
        return [IxMod.panic()];
      }
      let a: ServiceAccount;
      if (_w7 === 2n ** 64n - 1n && delta.has(s)) {
        a = delta.get(s)!;
      } else if (delta.has(w7 as ServiceIndex)) {
        a = delta.get(w7 as ServiceIndex)!;
      } else {
        return [IxMod.w7(HostCallResult.NONE)];
      }

      const v = historicalLookup(
        a,
        t,
        HashCodec.decode(context.memory.getBytes(toSafeMemoryAddress(h), 32))
          .value,
      )!;

      if (typeof v === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }

      const f = Math.min(Number(w10), v.length);
      const l = Math.min(Number(w11), v.length - f);
      if (!context.memory.canWrite(toSafeMemoryAddress(o), l)) {
        return [IxMod.panic()];
      }

      return [IxMod.w7(v.length), IxMod.memory(o, v.subarray(f, l))];
    },
  },
});

/**
 * `ΩE` in the graypaper
 * export segment host call
 */
export const omega_e = regFn<
  [ctx: RefineContext, segmentOffset: number],
  W7 | PVMSingleModObject<RefineContext> | PVMExitPanicMod
>({
  fn: {
    opCode: 7 as u8,
    identifier: "export",
    gasCost: 10n as Gas,
    execute(context, refineCtx, offset) {
      const [p, w8] = context.registers.slice(7);
      const z = Math.min(Number(w8), ERASURECODE_SEGMENT_SIZE);

      if (!context.memory.canRead(toSafeMemoryAddress(p), z)) {
        return [IxMod.panic()];
      }
      if (offset + refineCtx.e.length >= MAX_WORKPACKAGE_ENTRIES) {
        return [IxMod.w7(HostCallResult.FULL)];
      }
      const x = zeroPad(
        ERASURECODE_SEGMENT_SIZE,
        context.memory.getBytes(toSafeMemoryAddress(p), z),
      );

      return [
        IxMod.w7(offset + refineCtx.e.length),
        IxMod.obj({ ...refineCtx, e: [...refineCtx.e, x] }),
      ];
    },
  },
});

/**
 * `ΩM` in the graypaper
 *  Make PVM host call
 */
export const omega_m = regFn<
  [refineCtx: RefineContext],
  W7 | PVMSingleModObject<RefineContext> | PVMExitPanicMod
>({
  fn: {
    opCode: 8 as u8,
    identifier: "machine",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [p0, pz, i] = context.registers.slice(7);
      if (!context.memory.canRead(p0, Number(pz))) {
        return [IxMod.panic()];
      }
      const p = context.memory.getBytes(toSafeMemoryAddress(p0), Number(pz));
      const sortedKeys = [...refineCtx.m.keys()].sort((a, b) => a - b);
      let n = 0;
      while (sortedKeys.length > 0 && n == sortedKeys[0]) {
        sortedKeys.shift()!;
        n++;
      }
      const u = new PVMMemory(new Map(), new Map(), {
        start: <u32>0,
        end: <u32>0,
        pointer: <u32>0,
      });
      const newM = new Map(refineCtx.m);
      newM.set(n, {
        programCode: p,
        memory: u,
        instructionPointer: Number(i) as u32,
      });
      return [
        IxMod.w7(n), // new Service index?
        IxMod.obj({ ...refineCtx, m: newM }),
      ];
    },
  },
});

/**
 * `ΩP` in the graypaper
 * Peek PVM host call
 */
export const omega_p = regFn<
  [refineCtx: RefineContext],
  W7 | PVMSingleModMemory | PVMExitPanicMod
>({
  fn: {
    opCode: 9 as u8,
    identifier: "peek",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [n, o, s, z] = context.registers.slice(7);
      if (!context.memory.canWrite(o, Number(z))) {
        return [IxMod.panic()];
      }
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      if (!refineCtx.m.get(Number(n))!.memory.canRead(s, Number(z))) {
        return [IxMod.w7(HostCallResult.OOB)];
      }

      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.memory(
          o,
          refineCtx.m
            .get(Number(n))!
            .memory.getBytes(toSafeMemoryAddress(s), Number(z)),
        ),
      ];
    },
  },
});

/**
 * `ΩO` in the graypaper
 * Poke PVM host call
 */
export const omega_o = regFn<
  [RefineContext],
  W7 | PVMSingleModObject<RefineContext> | PVMExitPanicMod
>({
  fn: {
    opCode: 10 as u8,
    identifier: "poke",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [_n, s, o, z] = context.registers.slice(7);
      const n = Number(_n);
      if (!context.memory.canRead(s, Number(z))) {
        return [IxMod.panic()];
      }
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const u = refineCtx.m.get(n)!.memory;

      if (!u.canWrite(o, Number(z))) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const bold_s = context.memory.getBytes(
        toInBoundsMemoryAddress(s),
        Number(z),
      );

      const p_m = new Map(refineCtx.m);
      p_m.set(n, {
        programCode: refineCtx.m.get(n)!.programCode,
        memory: u.clone().setBytes(toInBoundsMemoryAddress(o), bold_s),
        instructionPointer: refineCtx.m.get(n)!.instructionPointer,
      });

      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ ...refineCtx, m: p_m })];
    },
  },
});

/**
 * `ΩZ`
 */
export const omega_z = regFn<
  [RefineContext],
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 11 as u8,
    identifier: "pages",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [n, p, c, r] = context.registers.slice(7);
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const u = refineCtx.m.get(Number(n))!.memory;

      if (r > 4 || p < 16 || p + c >= 2 ** 32 / Zp) {
        return [IxMod.w7(HostCallResult.HUH)];
      }
      if (r > 2 && u.canRead(p, Number(c))) {
        return [IxMod.w7(HostCallResult.HUH)];
      }

      const p_u = u.clone();
      for (let i = 0; i < c; i++) {
        if (r < 3) {
          p_u
            .changeAcl(Number(p) + i, PVMMemoryAccessKind.Write)
            .setBytes(<u32>((Number(p) + i) * Zp), new Uint8Array(Zp).fill(0)); // fill with zeros
        }

        if (r == 1n || r == 3n) {
          p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Read);
        } else if (r == 2n || r == 4n) {
          p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Write);
        } else if (r == 0n) {
          p_u.changeAcl(Number(p) + i, PVMMemoryAccessKind.Null);
        }
      }

      const p_m = new Map(refineCtx.m);
      p_m.set(Number(n), {
        ...refineCtx.m.get(Number(n))!,
        memory: p_u,
      });
      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ ...refineCtx, m: p_m })];
    },
  },
});

/**
 * `ΩK`
 * kick off pvm host call
 */
export const omega_k = regFn<
  [RefineContext],
  | W7
  | W8
  | PVMSingleModMemory
  | PVMSingleModObject<RefineContext>
  | PVMExitPanicMod
>({
  fn: {
    opCode: 12 as u8,
    identifier: "invoke",
    gasCost: 10n as Gas,
    execute(context: PVMProgramExecutionContextBase, refineCtx) {
      const [_n, o] = context.registers.slice(7);
      const n = Number(_n);
      if (!context.memory.canWrite(toSafeMemoryAddress(o), 112)) {
        return [IxMod.panic()];
      }
      if (!refineCtx.m.has(n)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const g = E_8.decode(
        context.memory.getBytes(toSafeMemoryAddress(o), 8),
      ).value;
      // registers
      const w = new Array(13)
        .fill(0n)
        .map(
          (_, i) =>
            E_8.decode(
              context.memory.getBytes(
                toSafeMemoryAddress(o + 8n + 8n * BigInt(i)),
                8,
              ),
            ).value,
        );

      const pvmCtx = {
        instructionPointer: refineCtx.m.get(n)!.instructionPointer,
        gas: g as Gas,
        registers: w as PVMProgramExecutionContextBase["registers"],
        memory: refineCtx.m.get(n)!.memory.clone(),
      };
      const res = basicInvocation(refineCtx.m.get(n)!.programCode, pvmCtx);

      // compute u*
      const newMemory = {
        from: o,
        newData: new Uint8Array(112),
      };
      E_8.encode(res.context.gas, newMemory.newData.subarray(0, 8));
      res.context.registers.forEach((v, i) =>
        E_8.encode(
          BigInt(v),
          newMemory.newData.subarray(8 + 8 * i, 16 + 8 * i),
        ),
      );

      // compute m*
      const mStar = new Map(refineCtx.m);
      mStar.set(n, {
        programCode: refineCtx.m.get(n)!.programCode,
        memory: <PVMMemory>res.context.memory,
        instructionPointer:
          typeof res.exitReason !== "undefined" &&
          typeof res.exitReason !== "number" &&
          res.exitReason.type == "host-call"
            ? ((res.context.instructionPointer + 1) as u32)
            : res.context.instructionPointer,
      });

      if (typeof res.exitReason === "number") {
        let exitReason = 0;
        if (res.exitReason === RegularPVMExitReason.OutOfGas) {
          exitReason = InnerPVMResultCode.OOG;
        } else if (res.exitReason === RegularPVMExitReason.Halt) {
          exitReason = InnerPVMResultCode.HALT;
        } else if (res.exitReason === RegularPVMExitReason.Panic) {
          exitReason = InnerPVMResultCode.PANIC;
        }

        return [
          IxMod.w7(exitReason),
          IxMod.memory(newMemory.from, newMemory.newData),
          IxMod.obj({ ...refineCtx, m: mStar }),
        ];
      } else if (res.exitReason.type === "host-call") {
        return [
          IxMod.w7(InnerPVMResultCode.HOST), // fixme "host",
          IxMod.w8(res.exitReason.opCode),
          IxMod.memory(newMemory.from, newMemory.newData),
          IxMod.obj({ ...refineCtx, m: mStar }),
        ];
      } else {
        return [
          IxMod.w7(InnerPVMResultCode.FAULT),
          IxMod.w8(res.exitReason.address),
          IxMod.memory(newMemory.from, newMemory.newData),
          IxMod.obj({ ...refineCtx, m: mStar }),
        ];
      }
    },
  },
});

/**
 * `ΩX` in the graypaper
 * expunge PVM host call
 */
export const omega_x = regFn<
  [RefineContext],
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 13 as u8,
    identifier: "expunge",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [_n] = context.registers.slice(7);
      const n = Number(_n) as u32;
      if (!refineCtx.m.has(n)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const entry = refineCtx.m.get(n)!;
      const newM = new Map(refineCtx.m);
      newM.delete(n);
      return [
        IxMod.w7(entry.instructionPointer),
        IxMod.obj({ ...refineCtx, m: newM }),
      ];
    },
  },
});
