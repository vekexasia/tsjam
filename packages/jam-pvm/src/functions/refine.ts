import { regFn } from "@/functions/fnsdb.js";
import {
  Delta,
  ExportSegment,
  Hash,
  PVMProgramExecutionContextBase,
  PVMSingleModMemory,
  PVMSingleModObject,
  ServiceAccount,
  ServiceIndex,
  Tau,
  u32,
  u64,
  u8,
} from "@vekexasia/jam-types";
import { W0, W1 } from "@/functions/utils.js";
import {
  ERASURECODE_BASIC_SIZE,
  ERASURECODE_EXPORTED_SIZE,
  HostCallResult,
} from "@vekexasia/jam-constants";
import { bytesToBigInt, historicalLookup } from "@vekexasia/jam-utils";
import { PVMMemory } from "@/pvmMemory.js";
import { E_4, E_8, PVMProgramCodec } from "@vekexasia/jam-codec";
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
  [W0, PVMSingleModMemory] | [W0]
>({
  fn: {
    opCode: 15 as u8,
    identifier: "historical_lookup",
    gasCost: 10n,
    execute(context, s: ServiceIndex, delta: Delta, t: Tau) {
      const [w0, h0, b0, bz] = context.registers;
      if (!context.memory.canWrite(b0, bz)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      let a: ServiceAccount | undefined;
      if (w0 === 2 ** 32 - 1 && delta.has(s)) {
        a = delta.get(s);
      } else if (delta.has(w0 as ServiceIndex)) {
        a = delta.get(w0 as ServiceIndex);
      }
      if (typeof a === "undefined" || !context.memory.canRead(h0, 32)) {
        return [IxMod.w0(HostCallResult.NONE)];
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(h0, 32));
      const v = historicalLookup(a, t, h);
      if (typeof v === "undefined") {
        return [IxMod.w0(HostCallResult.NONE)];
      }

      return [
        IxMod.w0(v.length),
        IxMod.memory(b0, v.subarray(0, Math.min(bz, v.length))),
      ];
    },
  },
});

/**
 * `ΩY` in the graypaper
 * import segment host cal
 */
export const omega_y = regFn<
  [i: ExportSegment[]],
  [W0, PVMSingleModMemory] | [W0]
>({
  fn: {
    opCode: 16 as u8,
    identifier: "import",
    gasCost: 10n,
    execute(context, i) {
      const [w0, o, w2] = context.registers;
      if (w0 >= i.length) {
        return [IxMod.w0(HostCallResult.NONE)];
      }
      const v = i[w0];
      const l = Math.min(
        w2,
        ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE,
      );

      if (!context.memory.canWrite(o, l)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      return [IxMod.w0(HostCallResult.OK), IxMod.memory(o, v.subarray(0, l))];
    },
  },
});

/**
 * `ΩZ` in the graypaper
 * export segment host call
 */
export const omega_z = regFn<
  [ctx: RefineContext, segmentOffset: number],
  Array<W0 | PVMSingleModObject<RefineContext>>
>({
  fn: {
    opCode: 17 as u8,
    identifier: "export",
    gasCost: 10n,
    execute(context, refineCtx, offset) {
      const [p, w1] = context.registers;
      const z = Math.min(
        w1,
        ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE,
      );
      if (!context.memory.canRead(p, z)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      if (offset + refineCtx.e.length >= 11 /* Wx */) {
        return [IxMod.w0(HostCallResult.FULL)];
      }
      const x = new Uint8Array(
        Math.ceil(z / (ERASURECODE_EXPORTED_SIZE * ERASURECODE_BASIC_SIZE)),
      ).fill(0);
      x.set(context.memory.getBytes(p, z));
      return [
        IxMod.w0(HostCallResult.OK),
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
  [W0, PVMSingleModObject<RefineContext>] | [W0]
>({
  fn: {
    opCode: 18 as u8,
    identifier: "machine",
    gasCost: 10n,
    execute(context, refineCtx) {
      const [p0, pz, i] = context.registers;
      if (!context.memory.canWrite(p0, pz)) {
        return [IxMod.w0(HostCallResult.OOB)];
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
      newM.set(n, { programCode: p, memory: mem, instructionPointer: i });
      return [
        IxMod.w0(n), // new Service index?
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
  [W0, PVMSingleModMemory] | [W0]
>({
  fn: {
    opCode: 19 as u8,
    identifier: "peek",
    gasCost: 10n,
    execute(context, refineCtx) {
      const [n, a, b, l] = context.registers;
      if (!refineCtx.m.has(n)) {
        return [IxMod.w0(HostCallResult.WHO)];
      }
      if (!refineCtx.m.get(n)!.memory.canRead(b, l)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      if (!context.memory.canWrite(a, l)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }

      return [
        IxMod.w0(HostCallResult.OK),
        IxMod.memory(a, refineCtx.m.get(n)!.memory.getBytes(b, l)),
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
  [W0, PVMSingleModObject<RefineContext>] | [W0]
>({
  fn: {
    opCode: 20 as u8,
    identifier: "poke",
    gasCost: 10n,
    execute(context, refineCtx) {
      const [n, a, b, l] = context.registers;
      if (!refineCtx.m.has(n)) {
        return [IxMod.w0(HostCallResult.WHO)];
      }
      const u = refineCtx.m.get(n)!.memory;

      if (!context.memory.canRead(a, l)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      const s = context.memory.getBytes(a, l);

      if (!context.memory.canRead(a, l)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      const p_u = u.clone();
      p_u.addACL({ from: b, to: (b + l) as u32, writable: true });
      p_u.setBytes(b, s);
      const p_m = new Map(refineCtx.m);
      p_m.set(n, {
        programCode: refineCtx.m.get(n)!.programCode,
        memory: p_u,
        instructionPointer: refineCtx.m.get(n)!.instructionPointer,
      });

      return [IxMod.w0(HostCallResult.OK), IxMod.obj({ ...refineCtx, m: p_m })];
    },
  },
});

/**
 * `ΩK` in the graypaper
 * kick off pvm host call
 */
export const omega_k = regFn<
  [RefineContext],
  Array<W0 | W1 | PVMSingleModMemory | PVMSingleModObject<RefineContext>>
>({
  fn: {
    opCode: 21 as u8,
    identifier: "invoke",
    gasCost: 10n,
    execute(context: PVMProgramExecutionContextBase, refineCtx) {
      const [n, o] = context.registers;
      if (!context.memory.canWrite(o, 60)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      if (!refineCtx.m.has(n)) {
        return [IxMod.w0(HostCallResult.WHO)];
      }
      const g = E_8.decode(context.memory.getBytes(o, 8)).value;
      // registers
      const w = new Array(13)
        .fill(0)
        .map((_, i) =>
          Number(E_4.decode(context.memory.getBytes(o + 8 + 4 * i, 4)).value),
        );
      const program = PVMProgramCodec.decode(
        refineCtx.m.get(n)!.programCode,
      ).value;
      const parsed = ParsedProgram.parse(program);

      const pvmCtx = {
        instructionPointer: refineCtx.m.get(n)!.instructionPointer,
        gas: g as u64,
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
        return [
          IxMod.w0(res.exitReason),
          IxMod.memory(newMemory.from, newMemory.newData),
          IxMod.obj({ ...refineCtx, m: mStar }),
        ];
      } else if (res.exitReason.type === "host-call") {
        return [
          IxMod.w0(0), // fixme "host",
          IxMod.w1(res.exitReason.opCode),
          IxMod.memory(newMemory.from, newMemory.newData),
          IxMod.obj({ ...refineCtx, m: mStar }),
        ];
      } else {
        return [
          IxMod.w0(1), // fixme "fault",
          IxMod.w1(res.exitReason.memoryLocationIn),
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
  Array<W0 | PVMSingleModObject<RefineContext>>
>({
  fn: {
    opCode: 22 as u8,
    identifier: "expunge",
    gasCost: 10n,
    execute(context, refineCtx) {
      const [n] = context.registers;
      if (!refineCtx.m.has(n)) {
        return [IxMod.w0(HostCallResult.WHO)];
      }
      const entry = refineCtx.m.get(n)!;
      const newM = new Map(refineCtx.m);
      newM.delete(n);
      return [
        IxMod.w0(entry.instructionPointer),
        IxMod.obj({ ...refineCtx, m: newM }),
      ];
    },
  },
});
