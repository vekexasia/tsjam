import { regFn } from "@/functions/fnsdb.js";
import {
  Delta,
  ExportSegment,
  Gas,
  Hash,
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
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  HostCallResult,
  InnerPVMResultCode,
  Zp,
} from "@tsjam/constants";
import { bytesToBigInt, historicalLookup } from "@tsjam/utils";
import { PVMMemory } from "@/pvmMemory.js";
import { E_4, E_8, PVMProgramCodec } from "@tsjam/codec";
import { basicInvocation } from "@/invocations/basic.js";
import { ParsedProgram } from "@/parseProgram.js";
import assert from "node:assert";
import { IxMod } from "@/instructions/utils.js";
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
  W7 | PVMSingleModMemory
>({
  fn: {
    opCode: 17 as u8,
    identifier: "historical_lookup",
    gasCost: 10n as Gas,
    execute(context, s: ServiceIndex, delta: Delta, t: Tau) {
      const [_w7, h0, b0, bz] = context.registers.slice(7);
      const w7 = Number(_w7);
      if (context.memory.canRead(h0, 32) || !context.memory.canWrite(b0, bz)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      let a: ServiceAccount | undefined;
      if (_w7 === 2n ** 64n - 1n && delta.has(s)) {
        a = delta.get(s);
      } else if (delta.has(w7 as ServiceIndex)) {
        a = delta.get(w7 as ServiceIndex);
      }
      if (typeof a === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(h0, 32));
      const v = historicalLookup(a, t, h);
      if (typeof v === "undefined") {
        return [IxMod.w7(HostCallResult.NONE)];
      }

      return [
        IxMod.w7(v.length),
        IxMod.memory(b0, v.subarray(0, Math.min(Number(bz), v.length))),
      ];
    },
  },
});

/**
 * `ΩY` in the graypaper
 * import segment host cal
 */
export const omega_y = regFn<[i: ExportSegment[]], W7 | PVMSingleModMemory>({
  fn: {
    opCode: 18 as u8,
    identifier: "import",
    gasCost: 10n as Gas,
    execute(context, i) {
      const [w7, o, w2] = context.registers.slice(7);
      const _w7 = Number(w7);
      if (w7 >= i.length) {
        return [IxMod.w7(HostCallResult.NONE)];
      }
      const v = i[_w7];
      const l = Math.min(
        Number(w2),
        ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE,
      );

      if (!context.memory.canWrite(o, l)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      return [IxMod.w7(HostCallResult.OK), IxMod.memory(o, v.subarray(0, l))];
    },
  },
});

/**
 * `ΩE` in the graypaper
 * export segment host call
 */
export const omega_e = regFn<
  [ctx: RefineContext, segmentOffset: number],
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 19 as u8,
    identifier: "export",
    gasCost: 10n as Gas,
    execute(context, refineCtx, offset) {
      // TODO:refactor
      const [p, w8] = context.registers.slice(7);
      const z = Math.min(
        Number(w8),
        ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE,
      );
      if (!context.memory.canRead(p, z)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      if (offset + refineCtx.e.length >= 11 /* Wx */) {
        return [IxMod.w7(HostCallResult.FULL)];
      }
      const x = new Uint8Array(
        Math.ceil(z / (ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE)),
      ).fill(0);
      x.set(context.memory.getBytes(p, z));
      return [
        IxMod.w7(HostCallResult.OK),
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
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 20 as u8,
    identifier: "machine",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [p0, pz, i] = context.registers.slice(7);
      if (!context.memory.canWrite(p0, pz)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const p = context.memory.getBytes(p0, pz);
      const sortedKeys = [...refineCtx.m.keys()].sort((a, b) => a - b);
      let n = 0;
      while (sortedKeys.length > 0 && n == sortedKeys[0]) {
        sortedKeys.shift()!;
        n++;
      }
      const mem = new PVMMemory([], []);
      const newM = new Map(refineCtx.m);
      newM.set(n, {
        programCode: p,
        memory: mem,
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
  W7 | PVMSingleModMemory
>({
  fn: {
    opCode: 21 as u8,
    identifier: "peek",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [n, a, b, l] = context.registers.slice(7);
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      if (!refineCtx.m.get(Number(n))!.memory.canRead(b, l)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      if (!context.memory.canWrite(a, l)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }

      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.memory(a, refineCtx.m.get(Number(n))!.memory.getBytes(b, l)),
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
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 22 as u8,
    identifier: "poke",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [_n, s, o, z] = context.registers.slice(7);
      const n = Number(_n);
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const u = refineCtx.m.get(n)!.memory;

      if (!context.memory.canRead(s, z)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      if (!u.canWrite(o, z)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const bold_s = context.memory.getBytes(s, z);

      const p_m = new Map(refineCtx.m);
      p_m.set(n, {
        programCode: refineCtx.m.get(n)!.programCode,
        memory: u.clone().setBytes(o, bold_s),
        instructionPointer: refineCtx.m.get(n)!.instructionPointer,
      });

      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ ...refineCtx, m: p_m })];
    },
  },
});

/**
 * `ΩZ` in the graypaper
 * Zero inner-PVM memory host-call
 */
export const omega_z = regFn<
  [RefineContext],
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 23 as u8,
    identifier: "zero",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [n, p, c] = context.registers.slice(7);
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const u = refineCtx.m.get(Number(n))!.memory;

      if (p + c >= 2 ** 32 || !u.canRead(p, c)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const p_u = u.clone();
      for (let page = 0; page < c; page++) {
        p_u
          .changeAcl(page, PVMMemoryAccessKind.Write)
          .setBytes(page * Zp, new Uint8Array(Zp).fill(0));
      }

      const p_m = new Map(refineCtx.m);
      p_m.set(Number(n), {
        programCode: refineCtx.m.get(Number(n))!.programCode,
        memory: p_u,
        instructionPointer: refineCtx.m.get(Number(n))!.instructionPointer,
      });
      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ ...refineCtx, m: p_m })];
    },
  },
});

/**
 * `ΩV` in the graypaper
 * Void inner-PVM memory host-call
 */
export const omega_v = regFn<
  [RefineContext],
  W7 | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 24 as u8,
    identifier: "void",
    gasCost: 10n as Gas,
    execute(context, refineCtx) {
      const [n, p, c] = context.registers.slice(7);
      if (!refineCtx.m.has(Number(n))) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const u = refineCtx.m.get(Number(n))!.memory;

      if (p + c >= 2 ** 32 || !u.canRead(p, c)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const p_u = u.clone();
      for (let page = 0; page < c; page++) {
        p_u
          .changeAcl(page, PVMMemoryAccessKind.Write) // needed for next line
          .setBytes(page * Zp, new Uint8Array(Zp).fill(0))
          .changeAcl(page, PVMMemoryAccessKind.Read);
      }

      const p_m = new Map(refineCtx.m);
      p_m.set(Number(n), {
        programCode: refineCtx.m.get(Number(n))!.programCode,
        memory: p_u,
        instructionPointer: refineCtx.m.get(Number(n))!.instructionPointer,
      });
      return [IxMod.w7(HostCallResult.OK), IxMod.obj({ ...refineCtx, m: p_m })];
    },
  },
});

/**
 * `ΩK` in the graypaper
 * kick off pvm host call
 */
export const omega_k = regFn<
  [RefineContext],
  W7 | W8 | PVMSingleModMemory | PVMSingleModObject<RefineContext>
>({
  fn: {
    opCode: 25 as u8,
    identifier: "invoke",
    gasCost: 10n as Gas,
    execute(context: PVMProgramExecutionContextBase, refineCtx) {
      const [_n, o] = context.registers.slice(7);
      const n = Number(_n);
      if (!context.memory.canWrite(o, 60)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      if (!refineCtx.m.has(n)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      const g = E_8.decode(context.memory.getBytes(o, 8)).value;
      // registers
      const w = new Array(13)
        .fill(0n)
        .map(
          (_, i) =>
            E_4.decode(context.memory.getBytes(Number(o) + 8 + 4 * i, 4)).value,
        );
      const program = PVMProgramCodec.decode(
        refineCtx.m.get(n)!.programCode,
      ).value;
      const parsed = ParsedProgram.parse(program);

      const pvmCtx = {
        instructionPointer: refineCtx.m.get(n)!.instructionPointer,
        gas: g as Gas,
        registers: w as PVMProgramExecutionContextBase["registers"],
        memory: refineCtx.m.get(n)!.memory.clone(),
      };
      const res = basicInvocation(
        { program: program, parsedProgram: parsed },
        pvmCtx,
      );

      // compute u*
      const newMemory = {
        from: o,
        newData: new Uint8Array(60),
      };
      E_8.encode(pvmCtx.gas, newMemory.newData.subarray(0, 8));
      w.forEach((v, i) =>
        E_4.encode(BigInt(v), newMemory.newData.subarray(8 + 4 * i, 4)),
      );

      // compute m*
      const mStar = new Map(refineCtx.m);
      mStar.set(n, {
        programCode: refineCtx.m.get(n)!.programCode,
        memory: pvmCtx.memory,
        instructionPointer:
          typeof res.exitReason !== "undefined" &&
          typeof res.exitReason !== "number" &&
          res.exitReason.type == "host-call"
            ? ((res.context.instructionPointer + 1) as u32)
            : res.context.instructionPointer,
      });

      assert(typeof res.exitReason !== "undefined", "exit reason is undefined");
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
          IxMod.w7(1), // fixme "fault",
          IxMod.w8(res.exitReason.memoryLocationIn),
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
    opCode: 26 as u8,
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
