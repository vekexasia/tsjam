import { PVMExitReasonImpl } from "@/impls/pvm/pvm-exit-reason-impl";
import {
  Gas,
  PVMExitReasonMod,
  PVMRegisterRawValue,
  PVMSingleModGas,
  PVMSingleModMemory,
  PVMSingleModObject,
  PVMSingleModPointer,
  PVMSingleModRegister,
  RegisterIdentifier,
  SingleRegisterIdentifier,
  u32,
  u8,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";
//import assert from "node:assert";

export const X_fn = (n: bigint) => (x: bigint) =>
  x + (x / 2n ** (8n * n - 1n)) * (2n ** 64n - 2n ** (8n * n));
export const X_4 = X_fn(4n);
export const X_8 = X_fn(8n);

/**
 * $(0.7.1 - A.33)
 */
export const smod = (a: bigint, b: bigint) => {
  if (b === 0n) {
    return a;
  }
  const asign = a < 0n ? -1n : 1n;
  // Math.abs on bigint
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;

  return asign * (a % b);
};
export const TRAP_COST = 1n;

export const IxMod = {
  ip: (value: number): PVMSingleModPointer => ({
    type: "ip",
    data: toTagged(value),
  }),
  hostCall: (opCode: u8): PVMExitReasonMod<PVMExitReasonImpl> => ({
    type: "exit",
    data: PVMExitReasonImpl.hostCall(opCode),
  }),
  pageFault: (
    location: u32,
    originalPointer: u32,
  ): [
    PVMSingleModGas,
    PVMSingleModPointer,
    PVMExitReasonMod<PVMExitReasonImpl>,
  ] => [
    IxMod.gas(TRAP_COST), // trap
    IxMod.ip(originalPointer), // override any other skip
    { type: "exit", data: PVMExitReasonImpl.pageFault(location) },
  ],
  skip: (ip: u32, amont: number): PVMSingleModPointer => ({
    type: "ip",
    data: toTagged(ip + amont),
  }),
  gas: (value: bigint): PVMSingleModGas => ({
    type: "gas",
    data: value as Gas,
  }),
  reg: <T extends RegisterIdentifier>(
    register: T,
    value: bigint,
  ): PVMSingleModRegister<T> => {
    // assert(register >= 0 && register < 13);
    return {
      type: "register",
      data: {
        index: register,
        value: <PVMRegisterRawValue>value,
      },
    };
  },
  w7: (value: bigint | number) =>
    IxMod.reg<SingleRegisterIdentifier<7>>(
      <SingleRegisterIdentifier<7>>7,
      BigInt(value),
    ),
  w8: (value: bigint | number) =>
    IxMod.reg<SingleRegisterIdentifier<8>>(
      <SingleRegisterIdentifier<8>>8,
      BigInt(value),
    ),
  memory: (from: number | bigint, data: Uint8Array): PVMSingleModMemory => ({
    type: "memory",
    data: {
      from: Number(from) as u32,
      data,
    },
  }),
  outOfGas: (): PVMExitReasonMod<PVMExitReasonImpl> => ({
    type: "exit",
    data: PVMExitReasonImpl.outOfGas(),
  }),
  halt: (): PVMExitReasonMod<PVMExitReasonImpl> => ({
    type: "exit",
    data: PVMExitReasonImpl.halt(),
  }),
  panic: (): PVMExitReasonMod<PVMExitReasonImpl> => ({
    type: "exit",
    data: PVMExitReasonImpl.panic(),
  }),
  obj: <T>(data: T): PVMSingleModObject<T> => ({
    type: "object",
    data,
  }),
};
