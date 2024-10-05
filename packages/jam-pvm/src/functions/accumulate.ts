import { regFn } from "@/functions/fnsdb.js";
import {
  Dagger,
  DeferredTransfer,
  Delta,
  Hash,
  PVMProgramExecutionContextBase,
  PVMResultContext,
  PVMSingleModObject,
  ServiceAccount,
  ServiceIndex,
  Tagged,
  Tau,
  UpToSeq,
  u32,
  u64,
  u8,
} from "@tsjam/types";
import {
  AUTHQUEUE_MAX_SIZE,
  CORES,
  HostCallResult,
  NUMBER_OF_VALIDATORS,
  PREIMAGE_EXPIRATION,
  SERVICE_MIN_BALANCE,
  TRANSFER_MEMO_SIZE,
} from "@tsjam/constants";
import { E_4, E_8, ValidatorDataCodec } from "@tsjam/codec";
import {
  bytesToBigInt,
  computeServiceAccountThreshold,
  toTagged,
} from "@tsjam/utils";
import { W0, W1, XMod, YMod } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";
import { check_fn } from "@/utils/check_fn";

/**
 * `ΩE`
 * empower service host call
 */
export const omega_e = regFn<[x: PVMResultContext], Array<W0 | XMod>>({
  fn: {
    opCode: 5 as u8,
    identifier: "empower",
    gasCost: 10n,
    execute(context, x) {
      const [m, a, v, o, n] = context.registers;
      if (!context.memory.canRead(o, 12 * n)) {
        return [IxMod.w0(HostCallResult.OOB)];
      } else {
        const g = new Map<ServiceIndex, u64>();
        const buf = context.memory.getBytes(o, 12 * n);
        for (let i = 0; i < n; i++) {
          const data = buf.subarray(i * 12, (i + 1) * 12);
          const key = E_4.decode(data).value;
          const value = E_8.decode(data.subarray(4)).value;
          g.set(Number(key) as ServiceIndex, value as u64);
        }
        return [
          IxMod.w0(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              p: {
                m: m as ServiceIndex,
                a: a as ServiceIndex,
                v: v as ServiceIndex,
                g,
              },
            },
          }),
        ];
      }
    },
  },
});

/**
 * `ΩA`
 * assign core host call
 */
export const omega_a = regFn<
  [x: PVMResultContext],
  Array<W0 | PVMSingleModObject<{ x: PVMResultContext }>>
>({
  fn: {
    opCode: 6 as u8,
    identifier: "assign",
    gasCost: 10n,
    execute(context, x) {
      const [w0, w1] = context.registers;
      const o = w1;
      if (!context.memory.canRead(o, AUTHQUEUE_MAX_SIZE * 32)) {
        return [IxMod.w0(HostCallResult.OOB), IxMod.obj({ x })];
      } else {
        const c = context.memory.getBytes(o, AUTHQUEUE_MAX_SIZE * 32);
        if (w0 < CORES) {
          const xc = x.c.slice() as PVMResultContext["c"];
          const nl: Hash[] = [];
          for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
            nl.push(bytesToBigInt(c.subarray(i * 32, (i + 1) * 32)));
          }
          xc[w0] = nl as PVMResultContext["c"][0];

          return [
            IxMod.w0(HostCallResult.OK),
            IxMod.obj({ x: { ...x, c: xc } }),
          ];
        } else {
          return [IxMod.w0(HostCallResult.CORE), IxMod.obj({ x })];
        }
      }
    },
  },
});

/**
 * `ΩD`
 * designate validators host call
 */
export const omega_d = regFn<
  [x: PVMResultContext],
  Array<W0 | PVMSingleModObject<{ x: PVMResultContext }>>
>({
  fn: {
    opCode: 7 as u8,
    identifier: "designate",
    gasCost: 10n,
    execute(context, x) {
      const [o] = context.registers;
      if (!context.memory.canRead(o, 336)) {
        return [IxMod.w0(HostCallResult.OOB), IxMod.obj({ x })];
      } else {
        const validators = [] as unknown as PVMResultContext["validatorKeys"];
        for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
          const c = context.memory.getBytes(o + 336 * i, 336);
          validators.push(ValidatorDataCodec.decode(c).value);
        }
        return [
          IxMod.w0(HostCallResult.OK),
          IxMod.obj({ x: { ...x, validatorKeys: validators } }),
        ];
      }
    },
  },
});

/**
 * `ΩC`
 * checkpoint host call
 */
export const omega_c = regFn<
  [x: PVMResultContext, y: PVMResultContext],
  Array<W0 | W1 | YMod>
>({
  fn: {
    opCode: 8 as u8,
    identifier: "checkpoint",
    gasCost: 10n,
    execute(context, x) {
      const p_y = x;
      const gasAfter = context.gas - (this.gasCost as bigint);
      return [
        IxMod.w0(Number(gasAfter % 2n ** 32n)),
        IxMod.w1(Number(gasAfter / 2n ** 32n)),
        IxMod.obj({ y: p_y }),
      ];
    },
  },
});

/**
 * `ΩN`
 * new-service host call
 */
export const omega_n = regFn<
  [x: PVMResultContext, dd_delta: Dagger<Delta>],
  Array<
    | W0
    | PVMSingleModObject<{
        x: PVMResultContext;
      }>
  >
>({
  fn: {
    opCode: 9 as u8,
    identifier: "new",
    gasCost: 10n,
    execute(context, x, d_delta) {
      const [o, l, gl, gh, ml, mh] = context.registers;

      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      const c: ServiceAccount["codeHash"] = bytesToBigInt(
        context.memory.getBytes(o, 32),
      );
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      const m = 2n ** 32n * BigInt(mh) + BigInt(ml);
      const a: ServiceAccount = {
        storage: new Map<Hash, Uint8Array>(),
        preimage_p: new Map<Hash, Uint8Array>(),
        preimage_l: new Map<
          Hash,
          Map<u32, u32>
        >() as unknown as ServiceAccount["preimage_l"],
        codeHash: c,
        balance: 0n,
        minGasAccumulate: g,
        minGasOnTransfer: m,
      };
      const nm: Map<Tagged<u32, "length">, UpToSeq<u32, 3, "Nt">> = new Map();
      nm.set(toTagged(l), toTagged([]));
      a.preimage_l.set(c, nm);

      a.balance = computeServiceAccountThreshold(a);
      const b = x.serviceAccount!.balance - a.balance;
      if (b < computeServiceAccountThreshold(x.serviceAccount!)) {
        return [IxMod.w0(HostCallResult.CASH)];
      }

      const bump = (a: ServiceIndex) =>
        2 ** 8 + ((a - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9));
      return [
        IxMod.w0(x.service),
        IxMod.obj({
          x: {
            ...x,
            service: check_fn(bump(x.service) as ServiceIndex, d_delta),
            n: new Map([[x.service, a]]),
            serviceAccount: {
              ...x.serviceAccount!,
              balance: b,
            },
          },
        }),
      ];
    },
  },
});

/**
 * `ΩU`
 * upgrade-service host call
 */
export const omega_u = regFn<
  [x: PVMResultContext, s: ServiceIndex],
  Array<W0 | XMod>
>({
  fn: {
    opCode: 10 as u8,
    identifier: "upgrade",
    gasCost: 10n,
    execute(context, x, s) {
      const [o, gh, gl, mh, ml] = context.registers;
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      const m = 2n ** 32n * BigInt(mh) + BigInt(ml);
      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w0(HostCallResult.OOB)];
      } else {
        const newMap: PVMResultContext["n"] = new Map(x.n);

        const a = { ...newMap.get(s)! };
        a.codeHash = bytesToBigInt(context.memory.getBytes(o, 32));
        a.minGasAccumulate = g;
        a.minGasOnTransfer = m;
        newMap.set(s, a);
        return [
          IxMod.w0(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              n: newMap,
            },
          }),
        ];
      }
    },
  },
});

export const omega_t = regFn<
  [x: PVMResultContext, s: ServiceIndex, delta: Delta],
  Array<W0 | XMod>
>({
  fn: {
    opCode: 11 as u8,
    identifier: "transfer",
    gasCost: (context: PVMProgramExecutionContextBase) => {
      return (
        10n +
        BigInt(context.registers[1]) +
        BigInt(context.registers[2]) * 2n ** 32n
      );
    },
    execute(context, x, s, delta) {
      const [d, al, ah, gl, gh, o] = context.registers;
      const a = 2n ** 32n * BigInt(ah) + BigInt(al);
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      if (!context.memory.canRead(o, TRANSFER_MEMO_SIZE)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      if (!delta.has(d as ServiceIndex) && !x.n.has(d as ServiceIndex)) {
        return [IxMod.w0(HostCallResult.WHO)];
      }
      const serviceAccount =
        delta.get(d as ServiceIndex) ?? x.n.get(d as ServiceIndex)!;
      if (g < serviceAccount.minGasOnTransfer) {
        return [IxMod.w0(HostCallResult.LOW)];
      }
      if (context.gas < g) {
        return [IxMod.w0(HostCallResult.HIGH)];
      }
      const b = x.serviceAccount!.balance - a;
      if (b < computeServiceAccountThreshold(x.serviceAccount!)) {
        return [IxMod.w0(HostCallResult.CASH)];
      }

      const t: DeferredTransfer = {
        sender: s,
        destination: d as ServiceIndex,
        amount: toTagged(a),
        gasLimit: toTagged(g),
        memo: toTagged(context.memory.getBytes(o, TRANSFER_MEMO_SIZE)),
      };

      return [
        IxMod.w0(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            transfers: x.transfers.slice().concat([t]),
            serviceAccount: {
              ...x.serviceAccount!,
              balance: b,
            },
          },
        }),
      ];
    },
  },
});

/**
 * `ΩX`
 * quit-service host call
 */
export const omega_x = regFn<
  [x: PVMResultContext, s: ServiceIndex, delta: Delta],
  Array<W0 | XMod>
>({
  fn: {
    opCode: 12 as u8,
    identifier: "quit",
    gasCost: 10n,
    execute(context, x, s, delta) {
      const [d, o] = context.registers;
      const a =
        x.serviceAccount!.balance -
        computeServiceAccountThreshold(x.serviceAccount!) +
        SERVICE_MIN_BALANCE;
      const g = context.gas;
      if (d === s || d === 2 ** 32 - 1) {
        // todo halt machine
        return [
          IxMod.w0(HostCallResult.OK),
          IxMod.obj({ x: { ...x, serviceAccount: undefined } }),
        ];
      }

      if (!context.memory.canRead(o, TRANSFER_MEMO_SIZE)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      if (!delta.has(d as ServiceIndex) && !x.n.has(d as ServiceIndex)) {
        return [IxMod.w0(HostCallResult.WHO)];
      }
      const serviceAccount =
        delta.get(d as ServiceIndex) ?? x.n.get(d as ServiceIndex)!;
      if (g < serviceAccount.minGasOnTransfer) {
        return [IxMod.w0(HostCallResult.LOW)];
      }

      // todo: signal pvm halt?
      return [
        IxMod.w0(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            serviceAccount: undefined,
            transfers: x.transfers.slice().concat([
              {
                sender: s as ServiceIndex,
                destination: d as ServiceIndex,
                amount: toTagged(a),
                gasLimit: toTagged(g),
                memo: toTagged(context.memory.getBytes(o, TRANSFER_MEMO_SIZE)),
              },
            ]),
          },
        }),
      ];
    },
  },
});

/**
 * `ΩS`
 * solicit-preimage host call
 */
export const omega_s = regFn<[x: PVMResultContext, t: Tau], Array<W0 | XMod>>({
  fn: {
    opCode: 13 as u8,
    identifier: "solicit",
    gasCost: 10n,
    execute(context, x, tau) {
      const [o, z] = context.registers;
      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(o, 32));
      const a_l: ServiceAccount["preimage_l"] = new Map(
        x.serviceAccount!.preimage_l,
      );
      const a: ServiceAccount = {
        ...x.serviceAccount!,
        preimage_l: a_l,
      };
      if (typeof a_l.get(h)?.get(toTagged(z)) === "undefined") {
        a_l.set(h, new Map([[toTagged(z), toTagged([])]]));
      } else {
        a_l.get(h)!.get(toTagged(z))!.push(tau);
      }
      const newL = a_l.get(h)!.get(toTagged(z))!.length;
      if (newL !== 3 && newL !== 0) {
        // third case of `a`
        // we either have 1 or 2 elements or more than 3
        return [IxMod.w0(HostCallResult.HUH)];
      } else if (a.balance < computeServiceAccountThreshold(a)) {
        return [IxMod.w0(HostCallResult.FULL)];
      } else {
        return [
          IxMod.w0(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              serviceAccount: a,
            },
          }),
        ];
      }
    },
  },
});

/**
 * `ΩF`
 * forget preimage host call
 */
export const omega_f = regFn<[x: PVMResultContext, t: Tau], Array<W0 | XMod>>({
  fn: {
    opCode: 14 as u8,
    identifier: "forget",
    gasCost: 10n,
    execute(context, x, t) {
      const [o, z] = context.registers;
      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w0(HostCallResult.OOB)];
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(o, 32));
      const a_l: ServiceAccount["preimage_l"] = new Map(
        x.serviceAccount!.preimage_l,
      );
      const a_p: ServiceAccount["preimage_p"] = new Map(
        x.serviceAccount!.preimage_p,
      );
      if (a_l.get(h)?.get(toTagged(z))?.length === 1) {
        a_l.get(h)!.get(toTagged(z))!.push(t);
      } else if (a_l.get(h)?.get(toTagged(z))?.length === 3) {
        const [x, y] = a_l.get(h)!.get(toTagged(z))!;
        if (y < t - PREIMAGE_EXPIRATION) {
          // todo: check
          a_l.get(h)!.set(toTagged(z), toTagged([x, y, t]));
        } else {
          return [IxMod.w0(HostCallResult.HUH)];
        }
      } else if (a_l.get(h)?.get(toTagged(z))?.length === 2) {
        const [, y] = a_l.get(h)!.get(toTagged(z))!;
        if (y < t - PREIMAGE_EXPIRATION) {
          a_l.get(h)!.delete(toTagged(z));
          if (a_l.get(h)!.size === 0) {
            a_l.delete(h);
          }
          a_p.delete(h);
        } else {
          return [IxMod.w0(HostCallResult.HUH)];
        }
      } else if (a_l.get(h)?.get(toTagged(z))?.length !== 0) {
        return [IxMod.w0(HostCallResult.HUH)];
      }
      return [
        IxMod.w0(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            serviceAccount: {
              ...x.serviceAccount!,
              preimage_l: a_l,
              preimage_p: a_p,
            },
          },
        }),
      ];
    },
  },
});
