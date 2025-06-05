import {
  buildGenericKeyValueCodec,
  createCodec,
  E_sub,
  E_sub_int,
  HashCodec,
  JamCodec,
  mapCodec,
} from "@tsjam/codec";
import {
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
import { ServiceAccountImpl } from "@tsjam/serviceaccounts";

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

export const serviceAccountFromTestInfo = (
  serviceIndex: ServiceIndex,
): JamCodec<ServiceAccount> => {
  return mapCodec(
    serviceInfoCodec,
    (info) => {
      const toRet = new ServiceAccountImpl(serviceIndex);
      toRet.codeHash = toTagged(info.codeHash);
      toRet.balance = info.balance;
      toRet.minGasAccumulate = info.minItemGas;
      toRet.minGasOnTransfer = info.minMemoGas;

      (toRet as any)["_i"] = info.items;
      (toRet as any)["_o"] = info.bytes;
      // NOTE: ^^ the above needs to be used when mocking the virtual computing functions
      return toRet as ServiceAccount;
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
  serviceAccountCodec: (serviceIndex: ServiceIndex) => JamCodec<ServiceAccount>,
): JamCodec<T> => {
  return buildGenericKeyValueCodec(
    E_sub_int<ServiceIndex>(4),
    serviceAccountCodec,
    (a, b) => a - b,
  );
};
