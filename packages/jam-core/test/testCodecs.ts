import {
  createArrayLengthDiscriminator,
  createCodec,
  createSequenceCodec,
  E_sub,
  E_sub_int,
  HashCodec,
  mapCodec,
  WorkPackageHashCodec,
  WorkReportCodec,
} from "@tsjam/codec";
import { EPOCH_LENGTH } from "@tsjam/constants";
import {
  AccumulationQueue,
  Gas,
  Hash,
  ServiceAccount,
  u32,
  u64,
  WorkPackageHash,
  WorkReport,
} from "@tsjam/types";
import { toTagged } from "@tsjam/utils";

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

export const serviceAccountFromTestServiceInfo = (
  info: Test_ServiceInfo,
): ServiceAccount => {
  const toRet: ServiceAccount = {
    balance: info.balance,
    codeHash: toTagged(info.codeHash),
    minGasAccumulate: info.minItemGas,
    minGasOnTransfer: info.minMemoGas,
    storage: undefined as any,
    preimage_l: undefined as any,
    preimage_p: undefined as any,
  };
  (toRet as any)["_i"] = info.items;
  (toRet as any)["_o"] = info.bytes;
  // NOTE: ^^ the above needs to be used when mocking the virtual computing functions
  return toRet;
};

// ReadyQueue
export const Test_AccQueueCodec = <T extends number>(epochLength: T) =>
  createSequenceCodec(
    epochLength,
    createArrayLengthDiscriminator(
      createCodec<AccumulationQueue[0][0]>([
        ["workReport", WorkReportCodec],
        [
          "dependencies",
          mapCodec(
            createArrayLengthDiscriminator(WorkPackageHashCodec),
            (v) => new Set(v),
            (s) => [...s.values()],
          ),
        ],
      ]),
    ),
  );

export const Test_AccHistoryCodec = <T extends number>(epochLength: T) =>
  createSequenceCodec(
    epochLength,
    mapCodec(
      createArrayLengthDiscriminator(WorkPackageHashCodec),
      (v) => new Set(v),
      (s) => [...s.values()],
    ),
  );
