import {
  buildGenericKeyValueCodec,
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  E_sub,
  E_sub_int,
  HashCodec,
  JamCodec,
  mapCodec,
  WorkPackageHashCodec,
  WorkReportCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  AccumulationHistory,
  AccumulationQueue,
  Delta,
  Gas,
  Hash,
  Posterior,
  ServiceAccount,
  ServiceIndex,
  u32,
  u64,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

export const posteriorCodec = <T>(codec: JamCodec<T>) =>
  codec as JamCodec<Posterior<T>>;

export type Test_ServiceInfo = {
  codeHash: Hash; // a_c
  balance: u64; //a_b
  minItemGas: Gas; //a_g
  minMemoGas: Gas; //a_m
  bytes: u64; //a_o (virtual)
  items: u32; //a_i (virtual)
};

export const serviceInfoCodec = createCodec<Test_ServiceInfo>([
  ["codeHash", HashCodec],
  ["balance", E_sub<u64>(8)],
  ["minItemGas", E_sub<Gas>(8)],
  ["minMemoGas", E_sub<Gas>(8)],
  ["bytes", E_sub<u64>(8)],
  ["items", E_sub_int<u32>(4)],
]);

export const serviceAccountFromTestInfo = (): JamCodec<ServiceAccount> => {
  return mapCodec(
    serviceInfoCodec,
    (info) => {
      const toRet: ServiceAccount = {
        balance: info.balance,
        codeHash: toTagged(info.codeHash),
        minGasAccumulate: info.minItemGas,
        minGasOnTransfer: info.minMemoGas,
        storage: new Map(),
        preimage_l: undefined as any,
        preimage_p: undefined as any,
      };
      (toRet as any)["_i"] = info.items;
      (toRet as any)["_o"] = info.bytes;
      // NOTE: ^^ the above needs to be used when mocking the virtual computing functions
      return toRet;
    },
    (account) => {
      return {
        bytes: (account as any)["_o"],
        codeHash: account.codeHash,
        balance: <u64>account.balance,
        items: (account as any)["_i"],
        minItemGas: account.minGasAccumulate,
        minMemoGas: account.minGasOnTransfer,
      };
    },
  );
};

export const buildTestDeltaCodec = <T extends Delta>(
  serviceInfoCodec: JamCodec<ServiceAccount>,
): JamCodec<T> => {
  return buildGenericKeyValueCodec(
    E_sub_int<ServiceIndex>(4),
    serviceInfoCodec,
    (a, b) => a - b,
  );
};
