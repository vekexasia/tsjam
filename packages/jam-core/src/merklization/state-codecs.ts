import { ServiceAccountImpl } from "@/impls/service-account-impl";
import { SlotImpl } from "@/impls/slot-impl";
import {
  createCodec,
  asCodec,
  E_sub,
  E_sub_int,
  JamCodec,
  JSONCodec,
  MapJSONCodec,
  Uint8ArrayJSONCodec,
  xBytesCodec,
} from "@tsjam/codec";
import {
  Balance,
  CodeHash,
  Gas,
  ServiceIndex,
  StateKey,
  u32,
  u64,
} from "@tsjam/types";

export const serviceAccountDataCodec = createCodec<
  Pick<
    ServiceAccountImpl,
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
  ["codeHash", xBytesCodec<CodeHash, 32>(32)],
  ["balance", E_sub<Balance>(8)],
  ["minAccGas", E_sub<Gas>(8)],
  ["minMemoGas", E_sub<Gas>(8)],
  ["totalOctets", E_sub<u64>(8)],
  ["gratis", E_sub<Balance>(8)],
  ["itemInStorage", E_sub_int<u32>(4)],
  ["created", asCodec(SlotImpl)],
  ["lastAcc", asCodec(SlotImpl)],
  ["parent", E_sub_int<ServiceIndex>(4)],
]);

export const traceJSONCodec = MapJSONCodec(
  { key: "key", value: "value" },
  Uint8ArrayJSONCodec as JSONCodec<StateKey, string>,
  Uint8ArrayJSONCodec,
);
