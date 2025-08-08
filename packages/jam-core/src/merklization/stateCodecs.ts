import { ServiceAccountImpl } from "@/classes/ServiceAccountImpl";
import { SlotImpl } from "@/classes/SlotImpl";
import { xBytesCodec } from "@/codecs/miscCodecs";
import {
  createCodec,
  E_sub,
  E_sub_int,
  JamCodec,
  JSONCodec,
  MapJSONCodec,
  Uint8ArrayJSONCodec,
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
  ["created", <JamCodec<SlotImpl>>SlotImpl],
  ["lastAcc", <JamCodec<SlotImpl>>SlotImpl],
  ["parent", E_sub_int<ServiceIndex>(4)],
]);

export const traceJSONCodec = MapJSONCodec(
  { key: "key", value: "value" },
  Uint8ArrayJSONCodec as JSONCodec<StateKey, string>,
  Uint8ArrayJSONCodec,
);
