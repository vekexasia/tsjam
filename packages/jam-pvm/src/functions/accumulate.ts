import { regFn } from "@/functions/fnsdb.js";
import {
  AuthorizerQueue,
  Dagger,
  DeferredTransfer,
  Delta,
  Hash,
  PVMAccumulationState,
  PVMProgramExecutionContextBase,
  PVMResultContext,
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
  serviceAccountGasThreshold,
  toTagged,
} from "@tsjam/utils";
import { W7, W8, XMod, YMod } from "@/functions/utils.js";
import { IxMod } from "@/instructions/utils.js";
import { check_fn } from "@/utils/check_fn";

/**
 * `ΩE`
 * empower service host call
 */
export const omega_e = regFn<[x: PVMResultContext], Array<W7 | XMod>>({
  fn: {
    opCode: 5 as u8,
    identifier: "empower",
    gasCost: 10n,
    execute(context, x) {
      const [m, a, v, o, n] = context.registers.slice(7);
      if (!context.memory.canRead(o, 12 * n)) {
        return [IxMod.w7(HostCallResult.OOB)];
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
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                privServices: {
                  m: m as ServiceIndex,
                  a: a as ServiceIndex,
                  v: v as ServiceIndex,
                  g,
                },
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
export const omega_a = regFn<[x: PVMResultContext], Array<W7 | XMod>>({
  fn: {
    opCode: 6 as u8,
    identifier: "assign",
    gasCost: 10n,
    execute(context, x) {
      const [w7, o] = context.registers.slice(7);
      if (!context.memory.canRead(o, AUTHQUEUE_MAX_SIZE * 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        const c = context.memory.getBytes(o, AUTHQUEUE_MAX_SIZE * 32);
        if (w7 < CORES) {
          const xc = x.u.authQueue.slice() as AuthorizerQueue;
          const nl: Hash[] = [];
          for (let i = 0; i < AUTHQUEUE_MAX_SIZE; i++) {
            nl.push(bytesToBigInt(c.subarray(i * 32, (i + 1) * 32)));
          }
          xc[w7] = nl as AuthorizerQueue[0];

          return [
            IxMod.w7(HostCallResult.OK),
            IxMod.obj({ x: { ...x, u: { ...x.u, authQueue: xc } } }),
          ];
        } else {
          return [IxMod.w7(HostCallResult.CORE)];
        }
      }
    },
  },
});

/**
 * `ΩD`
 * designate validators host call
 */
export const omega_d = regFn<[x: PVMResultContext], Array<W7 | XMod>>({
  fn: {
    opCode: 7 as u8,
    identifier: "designate",
    gasCost: 10n,
    execute(context, x) {
      const [o] = context.registers.slice(7);
      if (!context.memory.canRead(o, 336)) {
        return [IxMod.w7(HostCallResult.OOB), IxMod.obj({ x })];
      } else {
        const validators =
          [] as unknown as PVMAccumulationState["validatorKeys"];
        for (let i = 0; i < NUMBER_OF_VALIDATORS; i++) {
          const c = context.memory.getBytes(o + 336 * i, 336);
          validators.push(ValidatorDataCodec.decode(c).value);
        }
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({ x: { ...x, u: { ...x.u, validatorKeys: validators } } }),
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
  Array<W7 | W8 | YMod>
>({
  fn: {
    opCode: 8 as u8,
    identifier: "checkpoint",
    gasCost: 10n,
    execute(context, x) {
      const p_y = x;
      const gasAfter = context.gas - (this.gasCost as bigint);
      return [
        IxMod.w7(Number(gasAfter % 2n ** 32n)),
        IxMod.w8(Number(gasAfter / 2n ** 32n)),
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
  Array<W7 | XMod>
>({
  fn: {
    opCode: 9 as u8,
    identifier: "new",
    gasCost: 10n,
    execute(context, x, delta) {
      const [o, l, gl, gh, ml, mh] = context.registers.slice(7);

      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
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

      a.balance = serviceAccountGasThreshold(a);

      const x_bold_s = x.u.delta.get(x.service)!;

      const bump = (a: ServiceIndex) =>
        2 ** 8 + ((a - 2 ** 8 + 1) % (2 ** 32 - 2 ** 9));

      const newServiceIndex = check_fn(bump(x.service) as ServiceIndex, delta);
      const s: ServiceAccount = {
        ...x_bold_s,
        balance: x_bold_s.balance - a.balance,
      };

      if (s.balance < serviceAccountGasThreshold(x_bold_s)) {
        return [IxMod.w7(HostCallResult.CASH)];
      }
      return [
        IxMod.w7(x.service),
        IxMod.obj({
          x: {
            ...x,
            service: newServiceIndex,
            u: {
              ...x.u,
              delta: new Map([
                ...x.u.delta.entries(),
                [x.i, a],
                [x.service, s],
              ]),
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
export const omega_u = regFn<[x: PVMResultContext], Array<W7 | XMod>>({
  fn: {
    opCode: 10 as u8,
    identifier: "upgrade",
    gasCost: 10n,
    execute(context, x) {
      const [o, gh, gl, mh, ml] = context.registers.slice(7);
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      const m = 2n ** 32n * BigInt(mh) + BigInt(ml);
      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      } else {
        const x_bold_s = x.u.delta.get(x.service)!;
        const x_bold_s_prime = { ...x_bold_s };

        x_bold_s_prime.codeHash = bytesToBigInt(context.memory.getBytes(o, 32));
        x_bold_s_prime.minGasAccumulate = g;
        x_bold_s_prime.minGasOnTransfer = m;

        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                delta: new Map([
                  ...x.u.delta.entries(),
                  [x.service, x_bold_s_prime],
                ]),
              },
            },
          }),
        ];
      }
    },
  },
});

export const omega_t = regFn<[x: PVMResultContext], Array<W7 | XMod>>({
  fn: {
    opCode: 11 as u8,
    identifier: "transfer",
    gasCost: (context: PVMProgramExecutionContextBase) => {
      return (
        10n +
        BigInt(context.registers[8]) +
        BigInt(context.registers[9]) * 2n ** 32n
      );
    },
    execute(context, x) {
      const [d, al, ah, gl, gh, o] = context.registers.slice(7);
      const a = 2n ** 32n * BigInt(ah) + BigInt(al);
      const g = 2n ** 32n * BigInt(gh) + BigInt(gl);
      if (!context.memory.canRead(o, TRANSFER_MEMO_SIZE)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }

      const bold_d = new Map([...x.delta.entries(), ...x.u.delta.entries()]);
      if (!bold_d.has(d as ServiceIndex)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }

      if (g < bold_d.get(d as ServiceIndex)!.minGasOnTransfer) {
        return [IxMod.w7(HostCallResult.LOW)];
      }
      if (context.gas < g) {
        return [IxMod.w7(HostCallResult.HIGH)];
      }
      const x_bold_s = x.u.delta.get(x.service)!;
      const b = x_bold_s.balance - a;
      if (b < serviceAccountGasThreshold(x_bold_s)) {
        return [IxMod.w7(HostCallResult.CASH)];
      }

      const t: DeferredTransfer = {
        sender: x.service,
        destination: d as ServiceIndex,
        amount: toTagged(a),
        gasLimit: toTagged(g),
        memo: toTagged(context.memory.getBytes(o, TRANSFER_MEMO_SIZE)),
      };

      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            transfer: x.transfer.slice().concat([t]),
            u: {
              ...x.u,
              delta: new Map([
                ...x.u.delta.entries(),
                [x.service, { ...x_bold_s, balance: b }],
              ]),
            },
          },
        }),
      ];
    },
  },
});

/**
 * `ΩQ`
 * quit-service host call
 */
export const omega_q = regFn<[x: PVMResultContext], Array<W7 | XMod>>({
  fn: {
    opCode: 12 as u8,
    identifier: "quit",
    gasCost: 10n,
    execute(context, x) {
      const [d, o] = context.registers.slice(7);
      const x_bold_s = x.u.delta.get(x.service)!;
      const a =
        x_bold_s.balance -
        serviceAccountGasThreshold(x_bold_s) +
        SERVICE_MIN_BALANCE;
      const g = context.gas;
      const bold_d = new Map([...x.delta.entries(), ...x.u.delta.entries()]);
      if (d === 2 ** 32 - 1) {
        // TODO: halt machine
        const newDelta = new Map(x.u.delta);
        newDelta.delete(x.service);
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                delta: newDelta,
              },
            },
          }),
        ];
      }

      if (!context.memory.canRead(o, TRANSFER_MEMO_SIZE)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      if (!bold_d.has(d as ServiceIndex)) {
        return [IxMod.w7(HostCallResult.WHO)];
      }
      if (g < bold_d.get(d as ServiceIndex)!.minGasOnTransfer) {
        return [IxMod.w7(HostCallResult.LOW)];
      }

      // TODO: signal pvm halt?
      const newDelta = new Map(x.u.delta);
      newDelta.delete(x.service);
      return [
        IxMod.w7(HostCallResult.OK),
        IxMod.obj({
          x: {
            ...x,
            u: { ...x.u, delta: newDelta },
            transfer: x.transfer.slice().concat([
              {
                sender: x.service,
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
export const omega_s = regFn<[x: PVMResultContext, t: Tau], Array<W7 | XMod>>({
  fn: {
    opCode: 13 as u8,
    identifier: "solicit",
    gasCost: 10n,
    execute(context, x, tau) {
      const [o, z] = context.registers.slice(7);
      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
      }
      const h: Hash = bytesToBigInt(context.memory.getBytes(o, 32));
      const x_bold_s = x.u.delta.get(x.service)!;
      const a_l: ServiceAccount["preimage_l"] = new Map(x_bold_s.preimage_l);
      if (typeof a_l.get(h)?.get(toTagged(z)) === "undefined") {
        a_l.set(h, new Map([[toTagged(z), toTagged([])]]));
      } else {
        a_l.get(h)!.get(toTagged(z))!.push(tau);
      }
      const a: ServiceAccount = {
        ...x_bold_s,
        preimage_l: a_l,
      };
      const newL = a_l.get(h)!.get(toTagged(z))!.length;
      if (newL !== 3 && newL !== 0) {
        // third case of `a`
        // we either have 1 or 2 elements or more than 3
        return [IxMod.w7(HostCallResult.HUH)];
      } else if (a.balance < serviceAccountGasThreshold(a)) {
        return [IxMod.w7(HostCallResult.FULL)];
      } else {
        return [
          IxMod.w7(HostCallResult.OK),
          IxMod.obj({
            x: {
              ...x,
              u: {
                ...x.u,
                delta: new Map([...x.u.delta.entries(), [x.service, a]]),
              },
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
export const omega_f = regFn<[x: PVMResultContext, t: Tau], Array<W7 | XMod>>({
  fn: {
    opCode: 14 as u8,
    identifier: "forget",
    gasCost: 10n,
    execute(context, x, t) {
      const [o, z] = context.registers;
      if (!context.memory.canRead(o, 32)) {
        return [IxMod.w7(HostCallResult.OOB)];
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
          return [IxMod.w7(HostCallResult.HUH)];
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
          return [IxMod.w7(HostCallResult.HUH)];
        }
      } else if (a_l.get(h)?.get(toTagged(z))?.length !== 0) {
        return [IxMod.w7(HostCallResult.HUH)];
      }
      return [
        IxMod.w7(HostCallResult.OK),
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
