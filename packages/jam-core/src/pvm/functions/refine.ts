import { IxMod } from "@/instructions/utils.js";
import { basicInvocation } from "@/invocations/basic.js";
import {
  PVMMemory,
  toInBoundsMemoryAddress,
  toSafeMemoryAddress,
} from "@/pvmMemory.js";
import { E_8, HashCodec } from "@tsjam/codec";
import {
  ERASURECODE_SEGMENT_SIZE,
  HostCallResult,
  InnerPVMResultCode,
  MAX_WORKPACKAGE_ENTRIES,
  Zp,
} from "@tsjam/constants";
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
import { historicalLookup, toTagged, zeroPad } from "@tsjam/utils";
import { regFn } from "./fnsdb";
import { W7, W8 } from "./utils";

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
    execute(context, refineCtx) {},
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
