import {
  create32BCodec,
  createCodec,
  E_sub,
  E_sub_int,
  genericBytesBigIntCodec,
  JSONCodec,
  MapJSONCodec,
  Uint8ArrayJSONCodec,
} from "@tsjam/codec";
import {
  Balance,
  BigIntBytes,
  CodeHash,
  Gas,
  ServiceAccount,
  ServiceIndex,
  StateKey,
  Tau,
  u32,
  u64,
} from "@tsjam/types";

export const serviceAccountDataCodec = createCodec<
  Pick<
    ServiceAccount,
    | "codeHash"
    | "balance"
    | "minAccGas"
    | "minMemoGas"
    | "gratis"
    | "created"
    | "lastAcc"
    | "parent"
  > & {
    totalOctets: u64;
    itemInStorage: u32;
  }
>([
  ["codeHash", create32BCodec<CodeHash>()],
  ["balance", E_sub<Balance>(8)],
  ["minAccGas", E_sub<Gas>(8)],
  ["minMemoGas", E_sub<Gas>(8)],
  ["totalOctets", E_sub<u64>(8)],
  ["gratis", E_sub<Balance>(8)],
  ["itemInStorage", E_sub_int<u32>(4)],
  ["created", E_sub_int<Tau>(4)],
  ["lastAcc", E_sub_int<Tau>(4)],
  ["parent", E_sub_int<ServiceIndex>(4)],
]);

export const stateKeyCodec = genericBytesBigIntCodec<StateKeyBigInt, 31>(31);

export type StateKeyBigInt = BigIntBytes<31>;

export const traceJSONCodec = MapJSONCodec(
  { key: "key", value: "value" },
  Uint8ArrayJSONCodec as JSONCodec<StateKey, string>,
  Uint8ArrayJSONCodec,
);
